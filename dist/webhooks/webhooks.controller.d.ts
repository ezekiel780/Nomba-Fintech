import { WebhooksService } from './webhooks.service';
export declare class WebhooksController {
    private readonly webhooksService;
    private readonly logger;
    constructor(webhooksService: WebhooksService);
    handleNombaWebhook(req: any, res: any, signature: string, timestamp: string): Promise<any>;
}
