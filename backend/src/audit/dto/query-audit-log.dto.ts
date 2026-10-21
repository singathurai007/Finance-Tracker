import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { LogLevel } from '../../generated/prisma/client.js';

export class QueryAuditLogDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;
}
