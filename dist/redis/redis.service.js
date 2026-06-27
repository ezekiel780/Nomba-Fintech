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
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let RedisService = RedisService_1 = class RedisService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    async onModuleInit() {
        this.client = new ioredis_1.default(this.config.get('REDIS_URL'));
        this.client.on('connect', () => this.logger.log('Redis connected successfully'));
        this.client.on('error', (err) => this.logger.error('Redis error: ' + err.message));
    }
    async onModuleDestroy() {
        await this.client.quit();
        this.logger.log('Redis disconnected');
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async get(key) {
        return this.client.get(key);
    }
    async delete(key) {
        await this.client.del(key);
    }
    async exists(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async increment(key, ttlSeconds) {
        const count = await this.client.incr(key);
        if (ttlSeconds && count === 1) {
            await this.client.expire(key, ttlSeconds);
        }
        return count;
    }
    async cacheToken(token) {
        await this.set('nomba:access_token', token, 55 * 60);
    }
    async getCachedToken() {
        return this.get('nomba:access_token');
    }
    async setOtp(email, otp) {
        await this.set('otp:' + email, otp, 10 * 60);
    }
    async getOtp(email) {
        return this.get('otp:' + email);
    }
    async deleteOtp(email) {
        await this.delete('otp:' + email);
    }
    async incrementOtpAttempts(email) {
        return this.increment('otp_attempts:' + email, 60 * 60);
    }
    async getOtpAttempts(email) {
        const count = await this.get('otp_attempts:' + email);
        return count ? parseInt(count) : 0;
    }
    async markWebhookProcessed(requestId) {
        await this.set('webhook:' + requestId, '1', 24 * 60 * 60);
    }
    async isWebhookProcessed(requestId) {
        return this.exists('webhook:' + requestId);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map