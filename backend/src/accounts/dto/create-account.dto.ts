import { IsEnum, IsNumber, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { AccountType } from '../../generated/prisma/client.js';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
