import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
