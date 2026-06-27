import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class CheckoutController {
    private readonly checkoutService;
    constructor(checkoutService: CheckoutService);
    initiate(dto: CreateCheckoutDto): Promise<{
        orderReference: string;
        checkoutLink: string;
        amount: number;
        status: string;
    }>;
    getStatus(orderReference: string): Promise<{
        orderReference: string;
        localStatus: string;
        nombaStatus: any;
        vendor: string;
        amount: number;
        customerEmail: string;
    }>;
    callback(orderReference: string): Promise<{
        message: string;
        orderReference?: undefined;
    } | {
        message: string;
        orderReference: string;
    }>;
}
