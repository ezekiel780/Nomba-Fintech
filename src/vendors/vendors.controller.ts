import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { SettleVendorDto } from './dto/settle-vendor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @ApiOperation({ summary: 'Create a new vendor with isolated sub-account and virtual account' })
  @Post()
  create(@Body() dto: CreateVendorDto, @Request() req: any) {
    return this.vendorsService.createVendor(dto, req.user.id);
  }

  @ApiOperation({ summary: 'List all vendors for the logged-in admin' })
  @Get()
  findAll(@Request() req: any) {
    return this.vendorsService.getAllVendors(req.user.id);
  }

  @ApiOperation({ summary: "Get a vendor's sub-account balance" })
  @Get(':ref/balance')
  getBalance(@Param('ref') ref: string) {
    return this.vendorsService.getVendorBalance(ref);
  }

  @ApiOperation({ summary: 'Settle (payout) a vendor from collected funds' })
  @Post(':ref/settle')
  settle(
    @Param('ref') ref: string,
    @Body() dto: SettleVendorDto,
    @Request() req: any,
  ) {
    return this.vendorsService.settleVendor(
      ref,
      dto.amount,
      req.user.id,
      dto.narration,
    );
  }
}
