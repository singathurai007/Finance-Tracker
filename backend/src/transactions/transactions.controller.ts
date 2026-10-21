import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { QueryTransactionsDto } from './dto/query-transactions.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  findAll(@Query() query: QueryTransactionsDto) {
    return this.transactions.findAll(query);
  }

  // Declared before ':id' so "export" is not parsed as an id.
  @Get('export')
  async export(@Query() query: QueryTransactionsDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.transactions.exportCsv(query);
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="paisatrack-transactions-${stamp}.csv"`);

    // The BOM keeps Excel from mangling non-ASCII characters.
    return `\uFEFF${csv}`;
  }

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactions.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transactions.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransactionDto) {
    return this.transactions.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.transactions.remove(id);
  }
}
