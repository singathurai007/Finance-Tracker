import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Frequency, PaymentMethod, TransactionType } from '../../generated/prisma/client.js';

export class CreateRecurringDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

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

  @IsEnum(Frequency)
  frequency: Frequency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @IsDateString()
  nextRun: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
