"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors();
    app.setGlobalPrefix('api/v1');
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('VendHub API')
        .setDescription('Marketplace payment infrastructure built on the Nomba API')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Auth')
        .addTag('Vendors')
        .addTag('Webhooks')
        .addTag('Transactions')
        .addTag('Health')
        .build();
    const swaggerDocument = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, swaggerDocument);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    common_1.Logger.log('VendHub API running on: http://localhost:' + port + '/api/v1');
    common_1.Logger.log('Webhook URL: http://localhost:' + port + '/api/v1/webhooks/nomba');
    common_1.Logger.log('Swagger docs: http://localhost:' + port + '/api/docs');
}
bootstrap();
//# sourceMappingURL=main.js.map