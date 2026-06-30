import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private nomba: NombaService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async createCheckout(dto: CreateCheckoutDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { accountRef: dto.vendorRef },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor not found for the given vendorRef');
    }

    const orderReference = 'order_' + randomUUID();
    const callbackUrl = this.config.get<string>('CHECKOUT_CALLBACK_URL');

    if (!callbackUrl) {
      throw new InternalServerErrorException(
        'CHECKOUT_CALLBACK_URL is not configured on the server',
      );
    }

    this.logger.log(
      'Creating checkout order for vendor ' + vendor.name + ': NGN ' + dto.amountNaira,
    );

    const nombaOrder = await this.nomba.createCheckoutOrder({
      orderReference,
      amountNaira: dto.amountNaira,
      customerEmail: dto.customerEmail,
      callbackUrl,
      customerId: dto.customerId,
    });

    const session = await this.prisma.checkoutSession.create({
      data: {
        orderReference,
        amount: Math.round(dto.amountNaira * 100),
        currency: 'NGN',
        status: 'pending',
        checkoutLink: nombaOrder?.checkoutLink,
        customerEmail: dto.customerEmail,
        customerId: dto.customerId,
        vendorId: vendor.id,
      },
    });

    this.logger.log('Checkout session created: ' + orderReference);

    return {
      orderReference: session.orderReference,
      checkoutLink: session.checkoutLink,
      amount: dto.amountNaira,
      status: session.status,
    };
  }

  async getCheckoutStatus(orderReference: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { orderReference },
      include: { vendor: true },
    });

    if (!session) {
      throw new NotFoundException('Checkout session not found');
    }

    let nombaStatus: any = null;
    try {
      nombaStatus = await this.nomba.getCheckoutOrder(orderReference);
    } catch (err: any) {
      this.logger.warn(
        'Could not fetch live status from Nomba for ' + orderReference + ': ' + err.message,
      );
    }

    const amountKobo = Number(session.amount);

    return {
      orderReference: session.orderReference,
      localStatus: session.status,
      nombaStatus: nombaStatus?.status || 'unknown',
      vendor: session.vendor.name,
      amount: amountKobo / 100,
      customerEmail: session.customerEmail,
    };
  }

  async handleCallback(orderReference: string) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { orderReference },
    });

    if (!session) {
      this.logger.warn('Callback received for unknown order: ' + orderReference);
      return { message: 'Order not found' };
    }

    this.logger.log('Customer returned from checkout for order: ' + orderReference);

    return {
      message: 'Payment is being verified. You will be notified once confirmed.',
      orderReference,
    };
  }
}
