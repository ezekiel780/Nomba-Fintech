import { TransactionsService } from './transactions.service';
import { NombaService } from '../nomba/nomba.service';
export declare class TransactionsController {
    private readonly transactionsService;
    private readonly nomba;
    constructor(transactionsService: TransactionsService, nomba: NombaService);
    findAll(dateFrom?: string, dateTo?: string, status?: string): Promise<any>;
    getBankCodes(): Promise<any>;
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
