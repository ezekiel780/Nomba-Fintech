"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nomba_module_1 = require("./nomba/nomba.module");
const vendors_module_1 = require("./vendors/vendors.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const transactions_module_1 = require("./transactions/transactions.module");
const auth_module_1 = require("./auth/auth.module");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const otp_module_1 = require("./otp/otp.module");
const health_module_1 = require("./health/health.module");
const checkout_module_1 = require("./checkout/checkout.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            otp_module_1.OtpModule,
            nomba_module_1.NombaModule,
            vendors_module_1.VendorsModule,
            webhooks_module_1.WebhooksModule,
            transactions_module_1.TransactionsModule,
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
            checkout_module_1.CheckoutModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map