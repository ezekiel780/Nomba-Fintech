import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private config;
    private readonly logger;
    private client;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    increment(key: string, ttlSeconds?: number): Promise<number>;
    cacheToken(token: string): Promise<void>;
    getCachedToken(): Promise<string | null>;
    setOtp(email: string, otp: string): Promise<void>;
    getOtp(email: string): Promise<string | null>;
    deleteOtp(email: string): Promise<void>;
    incrementOtpAttempts(email: string): Promise<number>;
    getOtpAttempts(email: string): Promise<number>;
    markWebhookProcessed(requestId: string): Promise<void>;
    isWebhookProcessed(requestId: string): Promise<boolean>;
}
