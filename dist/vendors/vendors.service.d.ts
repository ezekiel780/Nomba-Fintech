import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
export declare class VendorsService {
    private nomba;
    private prisma;
    private readonly logger;
    constructor(nomba: NombaService, prisma: PrismaService);
    createVendor(dto: CreateVendorDto, userId: string): Promise<{
        accountRef: string;
        bankCode: string;
        accountNumber: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        resolvedAccountName: string;
        subAccountId: string | null;
        virtualAccountNo: string | null;
        virtualBankName: string | null;
        userId: string;
    }>;
    getAllVendors(userId: string): Promise<{
        accountRef: string;
        bankCode: string;
        accountNumber: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        resolvedAccountName: string;
        subAccountId: string | null;
        virtualAccountNo: string | null;
        virtualBankName: string | null;
        userId: string;
    }[]>;
    getVendorBalance(ref: string): Promise<{
        vendor: string;
        balanceKobo: number;
        balanceNaira: number;
    }>;
    settleVendor(ref: string, amountNaira: number, userId: string, narration?: string): Promise<{
        merchantTxRef: string;
        transfer: any;
        payout: {
            id: string;
            amount: number;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            vendorId: string;
            userId: string;
            merchantTxRef: string;
            narration: string | null;
        };
    }>;
}
