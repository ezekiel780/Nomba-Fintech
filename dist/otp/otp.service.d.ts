import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
export declare class OtpService {
    private redis;
    private config;
    private readonly logger;
    private resend;
    constructor(redis: RedisService, config: ConfigService);
    private generateOtp;
    private checkRateLimit;
    sendOtp(email: string, name: string, type: 'register' | 'reset_password'): Promise<void>;
    verifyOtp(email: string, code: string): Promise<void>;
}
