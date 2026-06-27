import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class NombaService implements OnModuleInit {
  private readonly logger = new Logger(NombaService.name);
  private http: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private config: ConfigService) {
    this.http = axios.create({
      baseURL: this.config.get<string>('NOMBA_BASE_URL'),
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          this.logger.error(
            'Nomba API error [' + error.response.status + '] ' +
            error.config?.method?.toUpperCase() + ' ' + error.config?.url +
            ' -> ' + JSON.stringify(error.response.data),
          );
        } else {
          this.logger.error('Nomba API request failed: ' + error.message);
        }
        return Promise.reject(error);
      },
    );
  }

  async onModuleInit() {
    try {
      await this.getAccessToken();
    } catch (err: any) {
      this.logger.warn(
        'Could not reach Nomba at startup (' + err.message + '). Will retry on first API call.',
      );
    }
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.accessToken;
    }

    this.logger.log('Issuing new Nomba access token...');
    const res = await this.http.post(
      '/auth/token/issue',
      {
        grant_type: 'client_credentials',
        client_id: this.config.get('NOMBA_CLIENT_ID'),
        client_secret: this.config.get('NOMBA_PRIVATE_KEY'),
      },
      {
        headers: {
          accountId: this.config.get('NOMBA_ACCOUNT_ID'),
        },
      },
    );

    this.accessToken = res.data.data.access_token;
    this.tokenExpiresAt = now + 60 * 60 * 1000;
    this.logger.log('Access token issued and cached.');
    return this.accessToken as string;
  }

  private async authHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: 'Bearer ' + token,
      accountId: this.config.get<string>('NOMBA_ACCOUNT_ID'),
      'Content-Type': 'application/json',
    };
  }

  async createSubAccount(accountName: string, accountRef: string) {
    const headers = await this.authHeaders();
    const res = await this.http.post(
      '/accounts/sub-accounts',
      { accountName, accountRef },
      { headers },
    );
    return res.data.data;
  }

  async getSubAccountBalance(subAccountId: string) {
    const headers = await this.authHeaders();
    const res = await this.http.get(
      '/accounts/sub-accounts/' + subAccountId + '/balance',
      { headers },
    );
    return res.data.data;
  }

  async createVirtualAccount(payload: {
    accountRef: string;
    accountName: string;
    expiryDate?: string;
    amount?: number;
  }) {
    const headers = await this.authHeaders();
    const res = await this.http.post('/accounts/virtual', payload, { headers });
    return res.data.data;
  }

  async createCheckoutOrder(payload: {
    orderReference: string;
    amountNaira: number;
    customerEmail: string;
    callbackUrl: string;
    customerId?: string;
  }) {
    const headers = await this.authHeaders();
    const res = await this.http.post(
      '/checkout/order',
      {
        order: {
          orderReference: payload.orderReference,
          amount: payload.amountNaira.toFixed(2),
          currency: 'NGN',
          customerEmail: payload.customerEmail,
          callbackUrl: payload.callbackUrl,
          customerId: payload.customerId,
        },
      },
      { headers },
    );
    return res.data.data;
  }

  async getCheckoutOrder(orderReference: string) {
    const headers = await this.authHeaders();
    const res = await this.http.get('/checkout/order/' + orderReference, { headers });
    return res.data.data;
  }

  async chargeTokenizedCard(payload: {
    amount: number;
    currency: string;
    cardId: string;
    customerId: string;
    merchantTxRef: string;
  }) {
    const headers = await this.authHeaders();
    const res = await this.http.post('/tokenized-card/charge', payload, { headers });
    return res.data.data;
  }

  async bankAccountLookup(bankCode: string, accountNumber: string) {
    const headers = await this.authHeaders();
    const res = await this.http.post(
      '/transfers/bank/lookup',
      { bankCode, accountNumber },
      { headers },
    );
    return res.data.data;
  }

  async transferToBank(payload: {
    amount: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    senderName: string;
    narration: string;
    merchantTxRef: string;
  }) {
    const headers = await this.authHeaders();
    // NOTE: Nomba's transfer endpoint is versioned at /v2, unlike most other
    // endpoints which sit under /v1. NOMBA_BASE_URL includes /v1, so we
    // build the absolute path here rather than relying on the baseURL.
    const base = (this.config.get<string>('NOMBA_BASE_URL') || '').replace(/\/v1\/?$/, '');
    const res = await this.http.post(base + '/v2/transfers/bank', payload, { headers });
    return res.data.data;
  }

  async getTransactions(params: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    type?: string;
    cursor?: string;
  }) {
    const headers = await this.authHeaders();
    // Real endpoint is /transactions/accounts, returning { results: [...], cursor }
    const res = await this.http.get('/transactions/accounts', { headers, params });
    return res.data.data;
  }

  async getTransaction(merchantTxRef: string) {
    const headers = await this.authHeaders();
    const res = await this.http.get('/transactions/' + merchantTxRef, { headers });
    return res.data.data;
  }
}
