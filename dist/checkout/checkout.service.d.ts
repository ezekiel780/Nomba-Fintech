import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class CheckoutService {
    private nomba;
    private prisma;
    private readonly logger;
    constructor(nomba: NombaService, prisma: PrismaService);
    createCheckout(dto: CreateCheckoutDto): Promise<{
        orderReference: string;
        checkoutLink: string;
        amount: number;
        status: string;
    }>;
    getCheckoutStatus(orderReference: string): Promise<{
        orderReference: string;
        localStatus: string;
        nombaStatus: any;
        vendor: string;
        amount: number;
        customerEmail: string;
    }>;
    handleCallback(orderReference: string): Promise<{
        message: string;
        orderReference?: undefined;
    } | {
        message: string;
        orderReference: string;
    }>;
}
