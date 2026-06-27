import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { SettleVendorDto } from './dto/settle-vendor.dto';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
    create(dto: CreateVendorDto, req: any): Promise<{
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
    findAll(req: any): Promise<{
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
    getBalance(ref: string): Promise<{
        vendor: string;
        balanceKobo: number;
        balanceNaira: number;
    }>;
    settle(ref: string, dto: SettleVendorDto, req: any): Promise<{
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
