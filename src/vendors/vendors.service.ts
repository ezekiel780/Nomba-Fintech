import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private nomba: NombaService,
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async createVendor(dto: CreateVendorDto, userId: string) {
    const accountRef = 'vendor_' + randomUUID().split('-')[0];

    this.logger.log('Looking up bank account for vendor: ' + dto.name);
    const lookup = await this.nomba.bankAccountLookup(
      dto.bankCode,
      dto.accountNumber,
    );
    if (!lookup?.accountName) {
      throw new BadRequestException('Could not verify vendor bank account');
    }

    this.logger.log('Creating virtual account for: ' + dto.name);
    const virtualAccount = await this.nomba.createVirtualAccount({
      accountRef,
      accountName: 'VendHub - ' + dto.name,
    });

    const vendor = await this.prisma.vendor.create({
      data: {
        name: dto.name,
        email: dto.email,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        resolvedAccountName: lookup.accountName,
        accountRef,
        subAccountId: null,
        virtualAccountNo: virtualAccount?.accountNumber,
        virtualBankName: virtualAccount?.bankName,
        userId,
      },
    });

    this.logger.log('Vendor created: ' + accountRef);

    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (admin) {
      await this.email.sendVendorCreated(admin.email, vendor.name, vendor.accountRef);
    }

    return vendor;
  }

  async getAllVendors(userId: string) {
    return this.prisma.vendor.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVendorBalance(ref: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { accountRef: ref },
    });
    if (!vendor) throw new BadRequestException('Vendor not found');

    const balance = await this.prisma.transaction.aggregate({
      where: { vendorId: vendor.id, status: 'success' },
      _sum: { amount: true },
    });

    const totalKobo = balance._sum.amount ? Number(balance._sum.amount) : 0;

    return {
      vendor: vendor.name,
      balanceKobo: totalKobo,
      balanceNaira: totalKobo / 100,
    };
  }

  async settleVendor(
    ref: string,
    amountNaira: number,
    userId: string,
    narration?: string,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { accountRef: ref },
    });
    if (!vendor) throw new BadRequestException('Vendor not found');

    const lookup = await this.nomba.bankAccountLookup(
      vendor.bankCode,
      vendor.accountNumber,
    );

    const merchantTxRef = 'payout_' + ref + '_' + randomUUID();
    const amountKobo = Math.round(amountNaira * 100);

    const transfer = await this.nomba.transferToBank({
      amount: amountKobo,
      bankCode: vendor.bankCode,
      accountNumber: vendor.accountNumber,
      accountName: lookup.accountName,
      senderName: 'VendHub Marketplace',
      narration: narration || 'Payout to ' + vendor.name,
      merchantTxRef,
    });

    const payout = await this.prisma.payout.create({
      data: {
        merchantTxRef,
        amount: amountKobo,
        status: 'pending',
        narration: narration || 'Payout to ' + vendor.name,
        vendorId: vendor.id,
        userId,
      },
    });

    this.logger.log('Settlement initiated for ' + vendor.name + ': NGN ' + amountNaira);

    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (admin) {
      await this.email.sendTransferSuccessful(admin.email, vendor.name, amountNaira, merchantTxRef);
    }

    return {
      merchantTxRef,
      transfer,
      payout: {
        ...payout,
        amount: payout.amount.toString(),
      },
    };
  }
}
