import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { QueryAuditLogDto } from './dto/query-audit-log.dto.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@Query() query: QueryAuditLogDto) {
    return this.audit.list({ level: query.level, page: query.page, pageSize: query.pageSize });
  }
}
