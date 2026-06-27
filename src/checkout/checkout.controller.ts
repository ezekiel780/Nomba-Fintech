import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @ApiOperation({ summary: 'Create a hosted checkout order for a vendor' })
  @Post('initiate')
  initiate(@Body() dto: CreateCheckoutDto) {
    return this.checkoutService.createCheckout(dto);
  }

  @ApiOperation({ summary: 'Check the status of a checkout order' })
  @Get(':orderReference')
  getStatus(@Param('orderReference') orderReference: string) {
    return this.checkoutService.getCheckoutStatus(orderReference);
  }

  @ApiOperation({ summary: 'Callback URL customers are redirected to after payment' })
  @Get('callback')
  callback(@Query('orderReference') orderReference: string) {
    return this.checkoutService.handleCallback(orderReference);
  }
}
