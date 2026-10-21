import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { decimalToNumber, round } from '../common/money.js';
import { Period, periodEnd, periodStart, resolvePeriod } from '../common/period.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { Budget, Category } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { QueryBudgetDto } from './dto/query-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface BudgetDto {
  id: number;
  amount: number;
  month: number;
  year: number;
  categoryId: number;
  category: Category;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryBudgetDto): Promise<BudgetDto[]> {
    const period = resolvePeriod(query);

    const budgets = await this.prisma.budget.findMany({
      where: period,
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });

    if (budgets.length === 0) {
      return [];
    }

    const spentByCategory = await this.spentByCategory(
      period,
      budgets.map((budget) => budget.categoryId),
    );

    return budgets.map((budget) =>
      toBudgetDto(budget, spentByCategory.get(budget.categoryId) ?? 0),
    );
  }

  async findOne(id: number): Promise<BudgetDto> {
    const budget = await this.prisma.budget.findUnique({ where: { id }, include: { category: true } });

    if (!budget) {
      throw new NotFoundException(`Budget ${id} was not found`);
    }

    const spent = await this.spentByCategory({ month: budget.month, year: budget.year }, [budget.categoryId]);

    return toBudgetDto(budget, spent.get(budget.categoryId) ?? 0);
  }

  async create(dto: CreateBudgetDto): Promise<BudgetDto> {
    const category = await this.prisma.category.count({ where: { id: dto.categoryId } });
    if (category === 0) {
      throw new BadRequestException(`Category ${dto.categoryId} does not exist`);
    }

    try {
      const budget = await this.prisma.budget.create({
        data: {
          categoryId: dto.categoryId,
          amount: dto.amount,
          month: dto.month,
          year: dto.year,
        },
      });

      return this.findOne(budget.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A budget for this category and month already exists.');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateBudgetDto): Promise<BudgetDto> {
    await this.findOne(id);
    await this.prisma.budget.update({ where: { id }, data: { amount: dto.amount } });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.budget.delete({ where: { id } });
  }

  private async spentByCategory(period: Period, categoryIds: number[]): Promise<Map<number, number>> {
    if (categoryIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        type: 'EXPENSE',
        categoryId: { in: categoryIds },
        date: { gte: periodStart(period), lt: periodEnd(period) },
      },
      _sum: { amount: true },
    });

    return new Map(
      grouped
        .filter((row) => row.categoryId !== null)
        .map((row) => [row.categoryId as number, decimalToNumber(row._sum.amount)]),
    );
  }
}

function toBudgetDto(budget: Budget & { category: Category }, spent: number): BudgetDto {
  const amount = budget.amount.toNumber();
  const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;

  return {
    id: budget.id,
    amount,
    month: budget.month,
    year: budget.year,
    categoryId: budget.categoryId,
    category: budget.category,
    spent: round(spent),
    remaining: round(amount - spent),
    percentage,
    status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok',
  };
}
