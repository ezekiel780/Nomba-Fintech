import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
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

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log('VendHub API running on: http://localhost:' + port + '/api/v1');
  Logger.log('Webhook URL: http://localhost:' + port + '/api/v1/webhooks/nomba');
  Logger.log('Swagger docs: http://localhost:' + port + '/api/docs');
}

bootstrap();
