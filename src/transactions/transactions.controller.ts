import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NombaService } from '../nomba/nomba.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly nomba: NombaService,
  ) {}

  @ApiOperation({ summary: 'List transactions with optional date/status filters' })
  @Get()
  findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
  ) {
    return this.transactionsService.getTransactions({ dateFrom, dateTo, status });
  }

  @ApiOperation({ summary: 'Get the official list of Nigerian bank codes from Nomba' })
  @Get('bank-codes')
  getBankCodes() {
    return this.nomba.getBankCodes();
  }

  @ApiOperation({ summary: 'Run reconciliation between Nomba records and local ledger' })
  @Get('reconcile/run')
  reconcile(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.transactionsService.reconcile(dateFrom, dateTo);
  }

  @ApiOperation({ summary: 'Get a single transaction by merchantTxRef' })
  @Get(':ref')
  findOne(@Param('ref') ref: string) {
    return this.transactionsService.getTransaction(ref);
  }
}
