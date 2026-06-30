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
var WebhooksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const crypto = require("crypto");
let WebhooksService = WebhooksService_1 = class WebhooksService {
    constructor(config, prisma, redis) {
        this.config = config;
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(WebhooksService_1.name);
    }
    verifySignature(event, signature, timestamp) {
        if (!signature || !timestamp)
            return false;
        const secret = this.config.get('NOMBA_WEBHOOK_SECRET') ?? '';
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
        if (responseCode === 'null')
            responseCode = '';
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
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        }
        catch {
            return false;
        }
    }
    async isAlreadyProcessed(requestId) {
        const inRedis = await this.redis.isWebhookProcessed(requestId);
        if (inRedis) {
            this.logger.warn('Duplicate webhook ignored: ' + requestId);
            return true;
        }
        await this.redis.markWebhookProcessed(requestId);
        return false;
    }
    async processEvent(event) {
        if (await this.isAlreadyProcessed(event.requestId))
            return;
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
    async handlePaymentSuccess(event) {
        const data = event.data;
        const orderReference = data?.order?.orderReference ||
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
            this.logger.warn('No checkout session found for orderReference: ' + orderReference);
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
    async handleVirtualAccountFunded(event) {
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
    async handleTransferSuccess(event) {
        const data = event.data;
        const merchantTxRef = data?.merchantTxRef || data?.transaction?.transactionId;
        this.logger.log('Transfer success: ' + merchantTxRef);
        await this.prisma.payout.updateMany({
            where: { merchantTxRef },
            data: { status: 'success' },
        });
    }
    async handleTransferFailed(event) {
        const data = event.data;
        const merchantTxRef = data?.merchantTxRef || data?.transaction?.transactionId;
        this.logger.warn('Transfer failed: ' + merchantTxRef);
        await this.prisma.payout.updateMany({
            where: { merchantTxRef },
            data: { status: 'failed' },
        });
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = WebhooksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map