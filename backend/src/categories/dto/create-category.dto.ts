import { IsEnum, IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
