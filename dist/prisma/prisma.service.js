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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const adapter_pg_1 = require("@prisma/adapter-pg");
let PrismaService = PrismaService_1 = class PrismaService {
    constructor() {
        this.logger = new common_1.Logger(PrismaService_1.name);
        const adapter = new adapter_pg_1.PrismaPg({
            connectionString: process.env.DATABASE_URL,
        });
        const { PrismaClient } = require('@prisma/client');
        this.client = new PrismaClient({ adapter });
    }
    get user() { return this.client.user; }
    get vendor() { return this.client.vendor; }
    get transaction() { return this.client.transaction; }
    get webhookEvent() { return this.client.webhookEvent; }
    get payout() { return this.client.payout; }
    get checkoutSession() { return this.client.checkoutSession; }
    get otp() { return this.client.otp; }
    async $queryRaw(...args) { return this.client.$queryRaw(...args); }
    get $connect() { return this.client.$connect.bind(this.client); }
    get $disconnect() { return this.client.$disconnect.bind(this.client); }
    async onModuleInit() {
        await this.client.$connect();
        this.logger.log('Database connected successfully');
    }
    async onModuleDestroy() {
        await this.client.$disconnect();
        this.logger.log('Database disconnected');
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map