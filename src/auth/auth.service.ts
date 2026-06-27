import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OtpService } from '../otp/otp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private otp: OtpService,
    private jwt: JwtService,
  ) {}

  // --- Register -------------------------------------------------------------

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
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

  // --- Verify OTP (no token issued here) -------------------------------------

  async verifyOtp(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

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

  // --- Login (rate-limited, issues access + refresh tokens) -------------------

  async login(dto: LoginDto) {
    const attemptsKey = 'login_attempts:' + dto.email;
    const attempts = await this.redis.increment(attemptsKey, 15 * 60);

    if (attempts > 5) {
      this.logger.warn('Login rate limit hit for: ' + dto.email);
      throw new UnauthorizedException(
        'Too many failed login attempts. Please try again in 15 minutes.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    if (!user.isVerified) {
      await this.otp.sendOtp(user.email, user.name, 'register');
      throw new UnauthorizedException(
        'Email not verified. A new OTP has been sent to your email.',
      );
    }

    // Successful login - clear the attempt counter
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

  // --- Refresh Access Token ---------------------------------------------------

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
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

  // --- Logout (revoke refresh token) -------------------------------------------

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  // --- Forgot Password ------------------------------------------------------

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    await this.otp.sendOtp(email, user.name, 'reset_password');

    this.logger.log('Password reset OTP sent to: ' + email);
    return { message: 'Password reset OTP sent to your email.' };
  }

  // --- Reset Password -------------------------------------------------------

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

    await this.otp.verifyOtp(email, code);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    this.logger.log('Password reset successful for: ' + email);
    return { message: 'Password reset successful. Please login.' };
  }

  // --- Verify Refresh Token Signature -----------------------------------------

  verifyRefreshToken(token: string): any {
    try {
      return this.jwt.verify(token);
    } catch {
      return null;
    }
  }

  // --- Sign Tokens -------------------------------------------------------------

  private signAccessToken(user: any): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      { expiresIn: '15m' },
    );
  }

  private signRefreshToken(user: any): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, type: 'refresh' },
      { expiresIn: '30d' },
    );
  }
}
