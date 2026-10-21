import { PartialType } from '@nestjs/mapped-types';
import { CreateRecurringDto } from './create-recurring.dto.js';

export class UpdateRecurringDto extends PartialType(CreateRecurringDto) {}
