import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OtpService } from '../otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private redis;
    private otp;
    private jwt;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, otp: OtpService, jwt: JwtService);
    register(dto: RegisterDto): Promise<{
        message: string;
        userId: string;
    }>;
    verifyOtp(email: string, code: string): Promise<{
        message: string;
        user: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    login(dto: LoginDto): Promise<{
        message: string;
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
        };
    }>;
    refresh(userId: string, refreshToken: string): Promise<{
        message: string;
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(email: string, code: string, newPassword: string): Promise<{
        message: string;
    }>;
    verifyRefreshToken(token: string): any;
    private signAccessToken;
    private signRefreshToken;
}
