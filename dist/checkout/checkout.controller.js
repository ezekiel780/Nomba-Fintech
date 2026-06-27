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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const checkout_service_1 = require("./checkout.service");
const create_checkout_dto_1 = require("./dto/create-checkout.dto");
let CheckoutController = class CheckoutController {
    constructor(checkoutService) {
        this.checkoutService = checkoutService;
    }
    initiate(dto) {
        return this.checkoutService.createCheckout(dto);
    }
    getStatus(orderReference) {
        return this.checkoutService.getCheckoutStatus(orderReference);
    }
    callback(orderReference) {
        return this.checkoutService.handleCallback(orderReference);
    }
};
exports.CheckoutController = CheckoutController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Create a hosted checkout order for a vendor' }),
    (0, common_1.Post)('initiate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_checkout_dto_1.CreateCheckoutDto]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "initiate", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Check the status of a checkout order' }),
    (0, common_1.Get)(':orderReference'),
    __param(0, (0, common_1.Param)('orderReference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "getStatus", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Callback URL customers are redirected to after payment' }),
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('orderReference')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CheckoutController.prototype, "callback", null);
exports.CheckoutController = CheckoutController = __decorate([
    (0, swagger_1.ApiTags)('Checkout'),
    (0, common_1.Controller)('checkout'),
    __metadata("design:paramtypes", [checkout_service_1.CheckoutService])
], CheckoutController);
//# sourceMappingURL=checkout.controller.js.map