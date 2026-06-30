import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NombaService } from '../nomba/nomba.service';
export declare class WebhooksService {
    private config;
    private prisma;
    private redis;
    private nomba;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, redis: RedisService, nomba: NombaService);
    verifySignature(event: any, signature: string, timestamp: string): boolean;
    private isAlreadyProcessed;
    processEvent(event: any): Promise<void>;
    private handlePaymentSuccess;
    private handleVirtualAccountFunded;
    private handleTransferSuccess;
    private handleTransferFailed;
}
