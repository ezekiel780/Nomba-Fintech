import { ConfigService } from '@nestjs/config';
import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class CheckoutService {
    private nomba;
    private prisma;
    private config;
    private readonly logger;
    constructor(nomba: NombaService, prisma: PrismaService, config: ConfigService);
    createCheckout(dto: CreateCheckoutDto): Promise<{
        orderReference: any;
        checkoutLink: any;
        amount: number;
        status: any;
    }>;
    getCheckoutStatus(orderReference: string): Promise<{
        orderReference: any;
        localStatus: any;
        nombaStatus: any;
        vendor: any;
        amount: number;
        customerEmail: any;
    }>;
    handleCallback(orderReference: string): Promise<{
        message: string;
        orderReference?: undefined;
    } | {
        message: string;
        orderReference: string;
    }>;
}
