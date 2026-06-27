import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NombaModule } from './nomba/nomba.module';
import { VendorsModule } from './vendors/vendors.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { OtpModule } from './otp/otp.module';
import { HealthModule } from './health/health.module';
import { CheckoutModule } from './checkout/checkout.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    OtpModule,
    NombaModule,
    VendorsModule,
    WebhooksModule,
    TransactionsModule,
    AuthModule,
    HealthModule,
    CheckoutModule,
  ],
})
export class AppModule {}
