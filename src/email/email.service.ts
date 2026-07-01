import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.config.get<string>('RESEND_FROM_EMAIL') as string,
        to,
        subject,
        html,
      });
      this.logger.log('Email sent to: ' + to + ' [' + subject + ']');
    } catch (err: any) {
      this.logger.warn('Failed to send email to ' + to + ': ' + err.message);
    }
  }

  async sendVendorCreated(adminEmail: string, vendorName: string, accountRef: string): Promise<void> {
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<h2 style="color: #0B3D2E;">Vendor created successfully</h2>' +
      '<p style="color: #444;">Your vendor <strong>' + vendorName + '</strong> has been onboarded to VendHub.</p>' +
      '<div style="background: #E4EEE7; padding: 16px; border-radius: 8px; margin: 20px 0;">' +
      '<p style="margin: 0; font-family: monospace; color: #1A5C45;">Reference: ' + accountRef + '</p>' +
      '</div>' +
      '<p style="color: #888; font-size: 14px;">They can now receive payments through their dedicated virtual account.</p>' +
      '<hr style="border: none; border-top: 1px solid #eee;" />' +
      '<p style="color: #aaa; font-size: 12px;">VendHub Marketplace</p>' +
      '</div>';

    await this.send(adminEmail, 'Vendor created: ' + vendorName, html);
  }

  async sendTransferSuccessful(adminEmail: string, vendorName: string, amountNaira: number, merchantTxRef: string): Promise<void> {
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<h2 style="color: #0B3D2E;">Transfer successful</h2>' +
      '<p style="color: #444;">A payout of <strong>NGN ' + amountNaira.toLocaleString() + '</strong> to <strong>' + vendorName + '</strong> has been initiated.</p>' +
      '<div style="background: #E4EEE7; padding: 16px; border-radius: 8px; margin: 20px 0;">' +
      '<p style="margin: 0; font-family: monospace; color: #1A5C45;">Reference: ' + merchantTxRef + '</p>' +
      '</div>' +
      '<p style="color: #888; font-size: 14px;">You will be notified again once the bank confirms settlement.</p>' +
      '<hr style="border: none; border-top: 1px solid #eee;" />' +
      '<p style="color: #aaa; font-size: 12px;">VendHub Marketplace</p>' +
      '</div>';

    await this.send(adminEmail, 'Transfer initiated: NGN ' + amountNaira.toLocaleString(), html);
  }

  async sendVendorPayoutNotification(vendorEmail: string, vendorName: string, amountNaira: number, merchantTxRef: string): Promise<void> {
    const html =
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<h2 style="color: #0B3D2E;">Your payout is on the way</h2>' +
      '<p style="color: #444;">Hi <strong>' + vendorName + '</strong>,</p>' +
      '<p style="color: #444;">A payout of <strong>NGN ' + amountNaira.toLocaleString() + '</strong> has been initiated to your registered bank account.</p>' +
      '<div style="background: #E4EEE7; padding: 16px; border-radius: 8px; margin: 20px 0;">' +
      '<p style="margin: 4px 0; font-family: monospace; color: #1A5C45;">Amount: NGN ' + amountNaira.toLocaleString() + '</p>' +
      '<p style="margin: 4px 0; font-family: monospace; color: #1A5C45;">Reference: ' + merchantTxRef + '</p>' +
      '</div>' +
      '<p style="color: #888; font-size: 14px;">Funds typically arrive within minutes. Keep this reference for your records.</p>' +
      '<hr style="border: none; border-top: 1px solid #eee;" />' +
      '<p style="color: #aaa; font-size: 12px;">VendHub Marketplace</p>' +
      '</div>';

    await this.send(vendorEmail, 'Payout of NGN ' + amountNaira.toLocaleString() + ' initiated', html);
  }
}
