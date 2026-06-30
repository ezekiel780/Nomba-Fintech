import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @ApiOperation({ summary: 'Nomba webhook receiver (called by Nomba, not by clients)' })
  @Post('nomba')
  @HttpCode(200)
  async handleNombaWebhook(
    @Req() req: any,
    @Res() res: any,
    @Headers('nomba-signature') signature: string,
    @Headers('nomba-timestamp') timestamp: string,
  ) {
    const rawBody = req.rawBody as Buffer;
    const event = JSON.parse(rawBody.toString());

    const isValid = this.webhooksService.verifySignature(event, signature, timestamp);

    if (!isValid) {
      this.logger.warn('Invalid webhook signature - rejected');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const eventType = event.event_type || event.event;
    this.logger.log('Webhook received: ' + eventType + ' [' + event.requestId + ']');

    res.status(200).json({ received: true });

    await this.webhooksService.processEvent(event);
  }
}
