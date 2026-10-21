import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, TransactionType } from '../../generated/prisma/client.js';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @Type(() => Number)
  @IsInt()
  accountId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
