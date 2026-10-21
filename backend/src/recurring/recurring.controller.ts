import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateRecurringDto } from './dto/create-recurring.dto.js';
import { UpdateRecurringDto } from './dto/update-recurring.dto.js';
import { RecurringService } from './recurring.service.js';

@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Get()
  findAll() {
    return this.recurring.findAll();
  }

  @Post()
  create(@Body() dto: CreateRecurringDto) {
    return this.recurring.create(dto);
  }

  // Declared before ':id' so "run-due" is not parsed as an id.
  @Post('run-due')
  @HttpCode(HttpStatus.OK)
  runDue() {
    return this.recurring.runDue();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recurring.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecurringDto) {
    return this.recurring.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recurring.remove(id);
  }
}
