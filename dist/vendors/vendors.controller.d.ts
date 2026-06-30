import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { SettleVendorDto } from './dto/settle-vendor.dto';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
    create(dto: CreateVendorDto, req: any): Promise<any>;
    findAll(req: any): Promise<any>;
    getBalance(ref: string): Promise<{
        vendor: any;
        balanceKobo: number;
        balanceNaira: number;
    }>;
    settle(ref: string, dto: SettleVendorDto, req: any): Promise<{
        merchantTxRef: string;
        transfer: any;
        payout: any;
    }>;
}
