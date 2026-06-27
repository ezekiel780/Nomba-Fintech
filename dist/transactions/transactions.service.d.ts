import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class TransactionsService {
    private nomba;
    private prisma;
    private readonly logger;
    constructor(nomba: NombaService, prisma: PrismaService);
    getTransactions(params: {
        dateFrom?: string;
        dateTo?: string;
        status?: string;
    }): Promise<any>;
    getTransaction(merchantTxRef: string): Promise<any>;
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
}
