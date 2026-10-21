import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { BudgetsService } from './budgets.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { QueryBudgetDto } from './dto/query-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  findAll(@Query() query: QueryBudgetDto) {
    return this.budgets.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateBudgetDto) {
    return this.budgets.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.budgets.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto) {
    return this.budgets.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.budgets.remove(id);
  }
}
