import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  verifySignature(rawBody: Buffer, signature: string): boolean {
    if (!signature) return false;
    const secret = this.config.get<string>('NOMBA_WEBHOOK_SECRET') ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  private async isAlreadyProcessed(requestId: string): Promise<boolean> {
    const inRedis = await this.redis.isWebhookProcessed(requestId);
    if (inRedis) {
      this.logger.warn('Duplicate webhook ignored: ' + requestId);
      return true;
    }
    await this.redis.markWebhookProcessed(requestId);
    return false;
  }

  async processEvent(event: any) {
    if (await this.isAlreadyProcessed(event.requestId)) return;

    await this.prisma.webhookEvent.create({
      data: {
        requestId: event.requestId,
        eventType: event.event_type || event.event,
        payload: event,
      },
    });

    switch (event.event_type || event.event) {
      case 'payment_success':
        await this.handlePaymentSuccess(event);
        break;
      case 'virtual_account.funded':
        await this.handleVirtualAccountFunded(event);
        break;
      case 'payout_success':
      case 'transfer.success':
        await this.handleTransferSuccess(event);
        break;
      case 'payout_failed':
      case 'transfer.failed':
        await this.handleTransferFailed(event);
        break;
      default:
        this.logger.log('Unhandled event type: ' + (event.event_type || event.event));
    }
  }

  private async handlePaymentSuccess(event: any) {
    const data = event.data;
    // Nomba's real payload nests order info under data.order and the
    // transaction reference under data.transaction.merchantTxRef.
    // We try every plausible field since the exact shape can vary by
    // payment method (card vs tokenized vs bank transfer).
    const orderReference =
      data?.order?.orderReference ||
      data?.order?.orderId ||
      data?.transaction?.merchantTxRef ||
      data?.orderReference;

    if (!orderReference) {
      this.logger.warn(
        'payment_success event missing a recognizable order reference: ' +
        JSON.stringify(data?.order || {}),
      );
      return;
    }

    const session = await this.prisma.checkoutSession.findUnique({
      where: { orderReference },
    });

    if (!session) {
      this.logger.warn('No checkout session found for reference: ' + orderReference);
      return;
    }

    await this.prisma.checkoutSession.update({
      where: { orderReference },
      data: { status: 'paid' },
    });

    await this.prisma.transaction.create({
      data: {
        merchantTxRef: event.requestId,
        amount: session.amount,
        currency: session.currency,
        status: 'success',
        type: 'payment_success',
        customerEmail: session.customerEmail,
        customerId: session.customerId,
        vendorId: session.vendorId,
      },
    });

    this.logger.log('Payment success recorded for order: ' + orderReference);
  }

  private async handleVirtualAccountFunded(event: any) {
    const data = event.data;
    const received = data?.transaction?.transactionAmount;
    const accountRef = data?.transaction?.aliasAccountReference;

    this.logger.log('Virtual account funded: ' + accountRef);

    const vendor = await this.prisma.vendor.findUnique({
      where: { accountRef },
    });

    if (!vendor) {
      this.logger.warn('No vendor found for accountRef: ' + accountRef);
      return;
    }

    await this.prisma.transaction.create({
      data: {
        merchantTxRef: event.requestId,
        amount: Math.round(received * 100),
        currency: 'NGN',
        status: 'success',
        type: 'virtual_account.funded',
        narration: data?.transaction?.narration,
        vendorId: vendor.id,
      },
    });

    this.logger.log('Transaction recorded for vendor: ' + vendor.name);
  }

  private async handleTransferSuccess(event: any) {
    const data = event.data;
    const merchantTxRef = data?.merchantTxRef || data?.transaction?.transactionId;

    this.logger.log('Transfer success: ' + merchantTxRef);

    await this.prisma.payout.updateMany({
      where: { merchantTxRef },
      data: { status: 'success' },
    });
  }

  private async handleTransferFailed(event: any) {
    const data = event.data;
    const merchantTxRef = data?.merchantTxRef || data?.transaction?.transactionId;

    this.logger.warn('Transfer failed: ' + merchantTxRef);

    await this.prisma.payout.updateMany({
      where: { merchantTxRef },
      data: { status: 'failed' },
    });
  }
}
