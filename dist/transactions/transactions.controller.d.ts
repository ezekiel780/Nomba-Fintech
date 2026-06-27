import { TransactionsService } from './transactions.service';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    findAll(dateFrom?: string, dateTo?: string, status?: string): Promise<any>;
    reconcile(dateFrom: string, dateTo: string): Promise<{
        ranAt: string;
        period: {
            dateFrom: string;
            dateTo: string;
        };
        total: any;
        matched: number;
        orphans: any[];
        drifts: any[];
        status: string;
    }>;
    findOne(ref: string): Promise<any>;
}
