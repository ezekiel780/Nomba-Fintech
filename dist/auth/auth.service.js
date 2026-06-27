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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const otp_service_1 = require("../otp/otp.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, redis, otp, jwt) {
        this.prisma = prisma;
        this.redis = redis;
        this.otp = otp;
        this.jwt = jwt;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,
                isVerified: false,
            },
        });
        await this.otp.sendOtp(dto.email, dto.name, 'register');
        this.logger.log('User registered: ' + dto.email);
        return {
            message: 'Registration successful. Please check your email for OTP.',
            userId: user.id,
        };
    }
    async verifyOtp(email, code) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        await this.otp.verifyOtp(email, code);
        const updated = await this.prisma.user.update({
            where: { email },
            data: { isVerified: true },
        });
        this.logger.log('User verified: ' + email);
        return {
            message: 'Email verified successfully. Please login to continue.',
            user: { id: updated.id, name: updated.name, email: updated.email },
        };
    }
    async login(dto) {
        const attemptsKey = 'login_attempts:' + dto.email;
        const attempts = await this.redis.increment(attemptsKey, 15 * 60);
        if (attempts > 5) {
            this.logger.warn('Login rate limit hit for: ' + dto.email);
            throw new common_1.UnauthorizedException('Too many failed login attempts. Please try again in 15 minutes.');
        }
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch)
            throw new common_1.UnauthorizedException('Invalid email or password');
        if (!user.isVerified) {
            await this.otp.sendOtp(user.email, user.name, 'register');
            throw new common_1.UnauthorizedException('Email not verified. A new OTP has been sent to your email.');
        }
        await this.redis.delete(attemptsKey);
        const accessToken = this.signAccessToken(user);
        const refreshToken = this.signRefreshToken(user);
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: hashedRefreshToken },
        });
        this.logger.log('User logged in: ' + dto.email);
        return {
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: { id: user.id, name: user.name, email: user.email },
        };
    }
    async refresh(userId, refreshToken) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.refreshToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const accessToken = this.signAccessToken(user);
        const newRefreshToken = this.signRefreshToken(user);
        const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: hashedRefreshToken },
        });
        this.logger.log('Token refreshed for: ' + user.email);
        return {
            message: 'Token refreshed',
            accessToken,
            refreshToken: newRefreshToken,
        };
    }
    async logout(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });
        return { message: 'Logged out successfully' };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        await this.otp.sendOtp(email, user.name, 'reset_password');
        this.logger.log('Password reset OTP sent to: ' + email);
        return { message: 'Password reset OTP sent to your email.' };
    }
    async resetPassword(email, code, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        await this.otp.verifyOtp(email, code);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        this.logger.log('Password reset successful for: ' + email);
        return { message: 'Password reset successful. Please login.' };
    }
    verifyRefreshToken(token) {
        try {
            return this.jwt.verify(token);
        }
        catch {
            return null;
        }
    }
    signAccessToken(user) {
        return this.jwt.sign({ sub: user.id, email: user.email, name: user.name }, { expiresIn: '15m' });
    }
    signRefreshToken(user) {
        return this.jwt.sign({ sub: user.id, email: user.email, type: 'refresh' }, { expiresIn: '30d' });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        otp_service_1.OtpService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map