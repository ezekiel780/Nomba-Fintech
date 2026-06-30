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
var NombaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NombaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let NombaService = NombaService_1 = class NombaService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(NombaService_1.name);
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        this.http = axios_1.default.create({
            baseURL: this.config.get('NOMBA_BASE_URL'),
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
        });
        this.http.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                this.logger.error('Nomba API error [' + error.response.status + '] ' +
                    error.config?.method?.toUpperCase() + ' ' + error.config?.url +
                    ' -> ' + JSON.stringify(error.response.data));
            }
            else {
                this.logger.error('Nomba API request failed: ' + error.message);
            }
            return Promise.reject(error);
        });
    }
    async onModuleInit() {
        try {
            await this.getAccessToken();
        }
        catch (err) {
            this.logger.warn('Could not reach Nomba at startup (' + err.message + '). Will retry on first API call.');
        }
    }
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiresAt - 5 * 60 * 1000) {
            return this.accessToken;
        }
        this.logger.log('Issuing new Nomba access token...');
        const res = await this.http.post('/auth/token/issue', {
            grant_type: 'client_credentials',
            client_id: this.config.get('NOMBA_CLIENT_ID'),
            client_secret: this.config.get('NOMBA_PRIVATE_KEY'),
        }, {
            headers: {
                accountId: this.config.get('NOMBA_ACCOUNT_ID'),
            },
        });
        this.accessToken = res.data.data.access_token;
        this.tokenExpiresAt = now + 60 * 60 * 1000;
        this.logger.log('Access token issued and cached.');
        return this.accessToken;
    }
    async authHeaders() {
        const token = await this.getAccessToken();
        return {
            Authorization: 'Bearer ' + token,
            accountId: this.config.get('NOMBA_ACCOUNT_ID'),
            'Content-Type': 'application/json',
        };
    }
    async getBankCodes() {
        const headers = await this.authHeaders();
        const res = await this.http.get('/transfers/banks', { headers });
        return res.data.data;
    }
    async verifyTransactionByOrderReference(orderReference) {
        const headers = await this.authHeaders();
        const res = await this.http.get('/transactions/accounts/single', {
            headers,
            params: { orderReference },
        });
        return res.data.data;
    }
    async createSubAccount(accountName, accountRef) {
        const headers = await this.authHeaders();
        const res = await this.http.post('/accounts/sub-accounts', { accountName, accountRef }, { headers });
        return res.data.data;
    }
    async getSubAccountBalance(subAccountId) {
        const headers = await this.authHeaders();
        const res = await this.http.get('/accounts/sub-accounts/' + subAccountId + '/balance', { headers });
        return res.data.data;
    }
    async createVirtualAccount(payload) {
        const headers = await this.authHeaders();
        const res = await this.http.post('/accounts/virtual', payload, { headers });
        return res.data.data;
    }
    async createCheckoutOrder(payload) {
        const headers = await this.authHeaders();
        const res = await this.http.post('/checkout/order', {
            order: {
                orderReference: payload.orderReference,
                amount: payload.amountNaira.toFixed(2),
                currency: 'NGN',
                customerEmail: payload.customerEmail,
                callbackUrl: payload.callbackUrl,
                customerId: payload.customerId,
            },
        }, { headers });
        return res.data.data;
    }
    async getCheckoutOrder(orderReference) {
        const headers = await this.authHeaders();
        const res = await this.http.get('/checkout/order/' + orderReference, { headers });
        return res.data.data;
    }
    async chargeTokenizedCard(payload) {
        const headers = await this.authHeaders();
        const res = await this.http.post('/tokenized-card/charge', payload, { headers });
        return res.data.data;
    }
    async bankAccountLookup(bankCode, accountNumber) {
        const headers = await this.authHeaders();
        const res = await this.http.post('/transfers/bank/lookup', { bankCode, accountNumber }, { headers });
        return res.data.data;
    }
    async transferToBank(payload) {
        const headers = await this.authHeaders();
        const base = (this.config.get('NOMBA_BASE_URL') || '').replace(/\/v1\/?$/, '');
        const res = await this.http.post(base + '/v2/transfers/bank', payload, { headers });
        return res.data.data;
    }
    async getTransactions(params) {
        const headers = await this.authHeaders();
        const res = await this.http.get('/transactions/accounts', { headers, params });
        return res.data.data;
    }
    async getTransaction(merchantTxRef) {
        const headers = await this.authHeaders();
        const res = await this.http.get('/transactions/' + merchantTxRef, { headers });
        return res.data.data;
    }
};
exports.NombaService = NombaService;
exports.NombaService = NombaService = NombaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NombaService);
//# sourceMappingURL=nomba.service.js.map