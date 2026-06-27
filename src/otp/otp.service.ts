import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private resend: Resend;

  constructor(
    private redis: RedisService,
    private config: ConfigService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async checkRateLimit(email: string): Promise<void> {
    const attempts = await this.redis.incrementOtpAttempts(email);
    if (attempts > 5) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again in 1 hour.',
      );
    }
  }

  async sendOtp(email: string, name: string, type: 'register' | 'reset_password'): Promise<void> {
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
      from: this.config.get<string>('RESEND_FROM_EMAIL') as string,
      to: email,
      subject,
      html: htmlBody,
    });

    this.logger.log('OTP sent to: ' + email + ' [type: ' + type + ']');
  }

  async verifyOtp(email: string, code: string): Promise<void> {
    const stored = await this.redis.getOtp(email);

    if (!stored) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (stored !== code) {
      throw new BadRequestException('Invalid OTP code.');
    }

    await this.redis.deleteOtp(email);
    this.logger.log('OTP verified for: ' + email);
  }
}
