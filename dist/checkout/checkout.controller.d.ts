import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class CheckoutController {
    private readonly checkoutService;
    constructor(checkoutService: CheckoutService);
    initiate(dto: CreateCheckoutDto): Promise<{
        orderReference: any;
        checkoutLink: any;
        amount: number;
        status: any;
    }>;
    getStatus(orderReference: string): Promise<{
        orderReference: any;
        localStatus: any;
        nombaStatus: any;
        vendor: any;
        amount: number;
        customerEmail: any;
    }>;
    callback(orderReference: string): Promise<{
        message: string;
        orderReference?: undefined;
    } | {
        message: string;
        orderReference: string;
    }>;
}
