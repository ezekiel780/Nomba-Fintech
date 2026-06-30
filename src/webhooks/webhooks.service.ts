import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NombaService } from '../nomba/nomba.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private nomba: NombaService,
  ) {}

  verifySignature(event: any, signature: string, timestamp: string): boolean {
    if (!signature || !timestamp) return false;

    const secret = this.config.get<string>('NOMBA_WEBHOOK_SECRET') ?? '';
    const data = event?.data || {};
    const merchant = data?.merchant || {};
    const transaction = data?.transaction || {};

    const eventType = event?.event_type || event?.event || '';
    const requestId = event?.requestId || '';
    const userId = merchant?.userId || '';
    const walletId = merchant?.walletId || '';
    const transactionId = transaction?.transactionId || '';
    const type = transaction?.type || '';
    const time = transaction?.time || '';
    let responseCode = transaction?.responseCode || '';
    if (responseCode === 'null') responseCode = '';

    const hashingPayload = [
      eventType,
      requestId,
      userId,
      walletId,
      transactionId,
      type,
      time,
      responseCode,
      timestamp,
    ].join(':');

    const expected = crypto
      .createHmac('sha256', secret)
      .update(hashingPayload)
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
    const orderReference =
      data?.order?.orderReference ||
      data?.order?.orderId ||
      data?.transaction?.merchantTxRef ||
      data?.orderReference;

    if (!orderReference) {
      this.logger.warn('payment_success event missing orderReference');
      return;
    }

    const session = await this.prisma.checkoutSession.findUnique({
      where: { orderReference },
    });

    if (!session) {
      this.logger.warn('No checkout session found for reference: ' + orderReference);
      return;
    }

    try {
      const verified = await this.nomba.verifyTransactionByOrderReference(orderReference);
      if (!verified || verified.status !== 'SUCCESS') {
        this.logger.warn('Server-side verification failed for: ' + orderReference);
        return;
      }
    } catch (err: any) {
      this.logger.warn('Could not verify transaction server-side for ' + orderReference + ': ' + err.message + '. Proceeding on webhook signature alone.');
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

    this.logger.log('Payment success verified and recorded for order: ' + orderReference);
  }

  private async handleVirtualAccountFunded(event: any) {
    const data = event.data;
    const received = data?.transaction?.transactionAmount;
    const accountRef = data?.transaction?.aliasAccountReference;

    const vendor = await this.prisma.vendor.findUnique({ where: { accountRef } });
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
    const merchantTxRef = event.data?.merchantTxRef || event.data?.transaction?.transactionId;
    await this.prisma.payout.updateMany({ where: { merchantTxRef }, data: { status: 'success' } });
    this.logger.log('Transfer success: ' + merchantTxRef);
  }

  private async handleTransferFailed(event: any) {
    const merchantTxRef = event.data?.merchantTxRef || event.data?.transaction?.transactionId;
    await this.prisma.payout.updateMany({ where: { merchantTxRef }, data: { status: 'failed' } });
    this.logger.warn('Transfer failed: ' + merchantTxRef);
  }
}
