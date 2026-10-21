import { Controller, Get, Query } from '@nestjs/common';
import { BreakdownQueryDto, ReportQueryDto, TrendQueryDto } from './dto/report-query.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@Query() query: ReportQueryDto) {
    return this.reports.summary(query);
  }

  @Get('category-breakdown')
  breakdown(@Query() query: BreakdownQueryDto) {
    return this.reports.breakdown(query);
  }

  @Get('monthly-trend')
  trend(@Query() query: TrendQueryDto) {
    return this.reports.trend(query);
  }
}
