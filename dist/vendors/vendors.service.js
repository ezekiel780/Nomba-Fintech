"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VendorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const nomba_service_1 = require("../nomba/nomba.service");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const crypto_1 = require("crypto");
let VendorsService = VendorsService_1 = class VendorsService {
    constructor(nomba, prisma, email) {
        this.nomba = nomba;
        this.prisma = prisma;
        this.email = email;
        this.logger = new common_1.Logger(VendorsService_1.name);
    }
    async createVendor(dto, userId) {
        const accountRef = 'vendor_' + (0, crypto_1.randomUUID)().split('-')[0];
        this.logger.log('Looking up bank account for vendor: ' + dto.name);
        const lookup = await this.nomba.bankAccountLookup(dto.bankCode, dto.accountNumber);
        if (!lookup?.accountName) {
            throw new common_1.BadRequestException('Could not verify vendor bank account');
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
    async getAllVendors(userId) {
        return this.prisma.vendor.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getVendorBalance(ref) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { accountRef: ref },
        });
        if (!vendor)
            throw new common_1.BadRequestException('Vendor not found');
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
    async settleVendor(ref, amountNaira, userId, narration) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { accountRef: ref },
        });
        if (!vendor)
            throw new common_1.BadRequestException('Vendor not found');
        const lookup = await this.nomba.bankAccountLookup(vendor.bankCode, vendor.accountNumber);
        const merchantTxRef = 'payout_' + ref + '_' + (0, crypto_1.randomUUID)();
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
};
exports.VendorsService = VendorsService;
exports.VendorsService = VendorsService = VendorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nomba_service_1.NombaService,
        prisma_service_1.PrismaService,
        email_service_1.EmailService])
], VendorsService);
//# sourceMappingURL=vendors.service.js.map