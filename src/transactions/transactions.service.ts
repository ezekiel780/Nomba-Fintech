import { Injectable, Logger } from '@nestjs/common';
import { NombaService } from '../nomba/nomba.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private nomba: NombaService,
    private prisma: PrismaService,
  ) {}

  async getTransactions(params: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    return this.nomba.getTransactions(params);
  }

  async getTransaction(merchantTxRef: string) {
    return this.nomba.getTransaction(merchantTxRef);
  }

  async reconcile(dateFrom: string, dateTo: string) {
    this.logger.log('Running reconciliation: ' + dateFrom + ' to ' + dateTo);

    const nombaData = await this.nomba.getTransactions({ dateFrom, dateTo });

    // Real Nomba response shape is { results: [...], cursor }
    const transactions = nombaData?.results || [];
    const orphans: any[] = [];
    const drifts: any[] = [];
    const matched: any[] = [];

    for (const tx of transactions) {
      if (!tx.merchantTxRef) continue;

      const local = await this.prisma.transaction.findUnique({
        where: { merchantTxRef: tx.merchantTxRef },
      });

      if (!local) {
        orphans.push(tx);
        this.logger.warn('Orphan transaction: ' + tx.merchantTxRef);
      } else if (local.amount !== tx.amount) {
        drifts.push({ nomba: tx, local });
        this.logger.warn('Amount drift on: ' + tx.merchantTxRef);
      } else {
        matched.push(tx.merchantTxRef);
      }
    }

    const report = {
      ranAt: new Date().toISOString(),
      period: { dateFrom, dateTo },
      total: transactions.length,
      matched: matched.length,
      orphans,
      drifts,
      status:
        orphans.length === 0 && drifts.length === 0
          ? 'CLEAN'
          : 'DRIFT_DETECTED',
    };

    this.logger.log('Reconciliation complete: ' + report.status);
    return report;
  }
}
