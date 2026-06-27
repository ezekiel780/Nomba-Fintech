import { IsString, IsNotEmpty, IsNumber, IsEmail, IsOptional, Min } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  vendorRef: string;

  @IsNumber()
  @Min(1)
  amountNaira: number;

  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}
