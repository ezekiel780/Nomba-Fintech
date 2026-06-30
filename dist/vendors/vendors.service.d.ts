import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
export declare class VendorsService {
    private nomba;
    private prisma;
    private email;
    private readonly logger;
    constructor(nomba: NombaService, prisma: PrismaService, email: EmailService);
    createVendor(dto: CreateVendorDto, userId: string): Promise<any>;
    getAllVendors(userId: string): Promise<any>;
    getVendorBalance(ref: string): Promise<{
        vendor: any;
        balanceKobo: number;
        balanceNaira: number;
    }>;
    settleVendor(ref: string, amountNaira: number, userId: string, narration?: string): Promise<{
        merchantTxRef: string;
        transfer: any;
        payout: any;
    }>;
}
