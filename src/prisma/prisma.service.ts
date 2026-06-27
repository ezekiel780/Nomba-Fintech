import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: any;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    const { PrismaClient } = require('@prisma/client');
    this.client = new PrismaClient({ adapter });
  }

  get user() { return this.client.user; }
  get vendor() { return this.client.vendor; }
  get transaction() { return this.client.transaction; }
  get webhookEvent() { return this.client.webhookEvent; }
  get payout() { return this.client.payout; }
  get checkoutSession() { return this.client.checkoutSession; }
  get otp() { return this.client.otp; }

  async $queryRaw(...args: any[]) { return this.client.$queryRaw(...args); }
  get $connect() { return this.client.$connect.bind(this.client); }
  get $disconnect() { return this.client.$disconnect.bind(this.client); }

  async onModuleInit() {
    await this.client.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    this.logger.log('Database disconnected');
  }
}
