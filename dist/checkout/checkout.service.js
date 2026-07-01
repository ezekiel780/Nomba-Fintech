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
var CheckoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nomba_service_1 = require("../nomba/nomba.service");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let CheckoutService = CheckoutService_1 = class CheckoutService {
    constructor(nomba, prisma, config) {
        this.nomba = nomba;
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(CheckoutService_1.name);
    }
    async createCheckout(dto) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { accountRef: dto.vendorRef },
        });
        if (!vendor) {
            throw new common_1.BadRequestException('Vendor not found for the given vendorRef');
        }
        const orderReference = 'order_' + (0, crypto_1.randomUUID)();
        const callbackBase = this.config.get('CHECKOUT_CALLBACK_URL');
        if (!callbackBase) {
            throw new common_1.InternalServerErrorException('CHECKOUT_CALLBACK_URL is not configured on the server');
        }
        const callbackUrl = callbackBase + '/' + orderReference;
        this.logger.log('Creating checkout order for vendor ' + vendor.name + ': NGN ' + dto.amountNaira);
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
    async getCheckoutStatus(orderReference) {
        const session = await this.prisma.checkoutSession.findUnique({
            where: { orderReference },
            include: { vendor: true },
        });
        if (!session) {
            throw new common_1.NotFoundException('Checkout session not found');
        }
        let nombaStatus = null;
        try {
            nombaStatus = await this.nomba.getCheckoutOrder(orderReference);
        }
        catch (err) {
            this.logger.warn('Could not fetch live status from Nomba for ' + orderReference + ': ' + err.message);
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
    async handleCallback(orderReference) {
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
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = CheckoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nomba_service_1.NombaService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map