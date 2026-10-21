import { IsNumber, IsPositive } from 'class-validator';

export class UpdateBudgetDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
