import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis(this.config.get<string>('REDIS_URL'));
    this.client.on('connect', () => this.logger.log('Redis connected successfully'));
    this.client.on('error', (err) => this.logger.error('Redis error: ' + err.message));
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  // --- Core Operations ------------------------------------------------------

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const count = await this.client.incr(key);
    if (ttlSeconds && count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }

  // --- Token Caching --------------------------------------------------------

  async cacheToken(token: string): Promise<void> {
    await this.set('nomba:access_token', token, 55 * 60);
  }

  async getCachedToken(): Promise<string | null> {
    return this.get('nomba:access_token');
  }

  // --- OTP Operations -------------------------------------------------------

  async setOtp(email: string, otp: string): Promise<void> {
    // OTP expires in 10 minutes
    await this.set('otp:' + email, otp, 10 * 60);
  }

  async getOtp(email: string): Promise<string | null> {
    return this.get('otp:' + email);
  }

  async deleteOtp(email: string): Promise<void> {
    await this.delete('otp:' + email);
  }

  // --- Rate Limiting --------------------------------------------------------

  async incrementOtpAttempts(email: string): Promise<number> {
    // Track OTP requests per email � resets every hour
    return this.increment('otp_attempts:' + email, 60 * 60);
  }

  async getOtpAttempts(email: string): Promise<number> {
    const count = await this.get('otp_attempts:' + email);
    return count ? parseInt(count) : 0;
  }

  // --- Webhook Deduplication ------------------------------------------------

  async markWebhookProcessed(requestId: string): Promise<void> {
    // Store processed webhook IDs for 24 hours
    await this.set('webhook:' + requestId, '1', 24 * 60 * 60);
  }

  async isWebhookProcessed(requestId: string): Promise<boolean> {
    return this.exists('webhook:' + requestId);
  }
}
