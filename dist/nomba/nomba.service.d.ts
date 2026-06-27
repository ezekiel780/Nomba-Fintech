import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class NombaService implements OnModuleInit {
    private config;
    private readonly logger;
    private http;
    private accessToken;
    private tokenExpiresAt;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    getAccessToken(): Promise<string>;
    private authHeaders;
    createSubAccount(accountName: string, accountRef: string): Promise<any>;
    getSubAccountBalance(subAccountId: string): Promise<any>;
    createVirtualAccount(payload: {
        accountRef: string;
        accountName: string;
        expiryDate?: string;
        amount?: number;
    }): Promise<any>;
    createCheckoutOrder(payload: {
        orderReference: string;
        amountNaira: number;
        customerEmail: string;
        callbackUrl: string;
        customerId?: string;
    }): Promise<any>;
    getCheckoutOrder(orderReference: string): Promise<any>;
    chargeTokenizedCard(payload: {
        amount: number;
        currency: string;
        cardId: string;
        customerId: string;
        merchantTxRef: string;
    }): Promise<any>;
    bankAccountLookup(bankCode: string, accountNumber: string): Promise<any>;
    transferToBank(payload: {
        amount: number;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        senderName: string;
        narration: string;
        merchantTxRef: string;
    }): Promise<any>;
    getTransactions(params: {
        dateFrom?: string;
        dateTo?: string;
        status?: string;
        type?: string;
        cursor?: string;
    }): Promise<any>;
    getTransaction(merchantTxRef: string): Promise<any>;
}
