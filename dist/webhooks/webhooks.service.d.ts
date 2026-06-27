import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class WebhooksService {
    private config;
    private prisma;
    private redis;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, redis: RedisService);
    verifySignature(rawBody: Buffer, signature: string): boolean;
    private isAlreadyProcessed;
    processEvent(event: any): Promise<void>;
    private handlePaymentSuccess;
    private handleVirtualAccountFunded;
    private handleTransferSuccess;
    private handleTransferFailed;
}
