import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private client;
    constructor();
    get user(): any;
    get vendor(): any;
    get transaction(): any;
    get webhookEvent(): any;
    get payout(): any;
    get checkoutSession(): any;
    get otp(): any;
    $queryRaw(...args: any[]): Promise<any>;
    get $connect(): any;
    get $disconnect(): any;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
