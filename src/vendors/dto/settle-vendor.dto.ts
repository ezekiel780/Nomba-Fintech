import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class SettleVendorDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  narration?: string;
}
