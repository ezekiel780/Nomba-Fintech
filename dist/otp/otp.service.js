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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
const resend_1 = require("resend");
const config_1 = require("@nestjs/config");
let OtpService = OtpService_1 = class OtpService {
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
        this.logger = new common_1.Logger(OtpService_1.name);
        this.resend = new resend_1.Resend(this.config.get('RESEND_API_KEY'));
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async checkRateLimit(email) {
        const attempts = await this.redis.incrementOtpAttempts(email);
        if (attempts > 5) {
            throw new common_1.BadRequestException('Too many OTP requests. Please try again in 1 hour.');
        }
    }
    async sendOtp(email, name, type) {
        await this.checkRateLimit(email);
        const otp = this.generateOtp();
        await this.redis.setOtp(email, otp);
        const subject = type === 'register'
            ? 'Verify your VendHub account'
            : 'Reset your VendHub password';
        const message = type === 'register'
            ? 'Welcome to VendHub! Use the code below to verify your account.'
            : 'Use the code below to reset your VendHub password.';
        const htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
            '<h2 style="color: #1a1a1a;">Hello, ' + name + '!</h2>' +
            '<p style="color: #444;">' + message + '</p>' +
            '<div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">' +
            '<h1 style="color: #1a1a1a; letter-spacing: 8px; font-size: 36px;">' + otp + '</h1>' +
            '</div>' +
            '<p style="color: #888; font-size: 14px;">This code expires in 10 minutes.</p>' +
            '<p style="color: #888; font-size: 14px;">If you did not request this, please ignore this email.</p>' +
            '<hr style="border: none; border-top: 1px solid #eee;" />' +
            '<p style="color: #aaa; font-size: 12px;">VendHub Marketplace</p>' +
            '</div>';
        await this.resend.emails.send({
            from: this.config.get('RESEND_FROM_EMAIL'),
            to: email,
            subject,
            html: htmlBody,
        });
        this.logger.log('OTP sent to: ' + email + ' [type: ' + type + ']');
    }
    async verifyOtp(email, code) {
        const stored = await this.redis.getOtp(email);
        if (!stored) {
            throw new common_1.BadRequestException('OTP expired or not found. Please request a new one.');
        }
        if (stored !== code) {
            throw new common_1.BadRequestException('Invalid OTP code.');
        }
        await this.redis.deleteOtp(email);
        this.logger.log('OTP verified for: ' + email);
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        config_1.ConfigService])
], OtpService);
//# sourceMappingURL=otp.service.js.map