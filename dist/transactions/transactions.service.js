"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransactionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const nomba_service_1 = require("../nomba/nomba.service");
const prisma_service_1 = require("../prisma/prisma.service");
let TransactionsService = TransactionsService_1 = class TransactionsService {
    constructor(nomba, prisma) {
        this.nomba = nomba;
        this.prisma = prisma;
        this.logger = new common_1.Logger(TransactionsService_1.name);
    }
    async getTransactions(params) {
        return this.nomba.getTransactions(params);
    }
    async getTransaction(merchantTxRef) {
        return this.nomba.getTransaction(merchantTxRef);
    }
    async reconcile(dateFrom, dateTo) {
        this.logger.log('Running reconciliation: ' + dateFrom + ' to ' + dateTo);
        const nombaData = await this.nomba.getTransactions({ dateFrom, dateTo });
        const transactions = nombaData?.results || [];
        const orphans = [];
        const drifts = [];
        const matched = [];
        for (const tx of transactions) {
            if (!tx.merchantTxRef)
                continue;
            const local = await this.prisma.transaction.findUnique({
                where: { merchantTxRef: tx.merchantTxRef },
            });
            if (!local) {
                orphans.push(tx);
                this.logger.warn('Orphan transaction: ' + tx.merchantTxRef);
            }
            else if (local.amount !== tx.amount) {
                drifts.push({ nomba: tx, local });
                this.logger.warn('Amount drift on: ' + tx.merchantTxRef);
            }
            else {
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
            status: orphans.length === 0 && drifts.length === 0
                ? 'CLEAN'
                : 'DRIFT_DETECTED',
        };
        this.logger.log('Reconciliation complete: ' + report.status);
        return report;
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = TransactionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nomba_service_1.NombaService,
        prisma_service_1.PrismaService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map