import { Injectable } from '@nestjs/common';
import { decimalToNumber, round } from '../common/money.js';
import { Period, daysInMonth, monthLabel, periodEnd, periodStart, resolvePeriod } from '../common/period.js';
import { PrismaService } from '../prisma.service.js';
import { BreakdownQueryDto, ReportQueryDto, TrendQueryDto } from './dto/report-query.dto.js';

export interface SummaryDto {
  month: number;
  year: number;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  averageDailySpend: number;
  topCategory: { name: string; total: number; color: string } | null;
}

export interface BreakdownItemDto {
  categoryId: number | null;
  name: string;
  color: string;
  total: number;
  percentage: number;
  count: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: ReportQueryDto): Promise<SummaryDto> {
    const period = resolvePeriod(query);
    const date = { gte: periodStart(period), lt: periodEnd(period) };

    const [income, expenses, transactionCount, topRows] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({ where: { type: 'INCOME', date }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { type: 'EXPENSE', date }, _sum: { amount: true } }),
      this.prisma.transaction.count({ where: { date } }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { type: 'EXPENSE', date },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
    ]);

    const totalIncome = decimalToNumber(income._sum.amount);
    const totalExpenses = decimalToNumber(expenses._sum.amount);
    const balance = totalIncome - totalExpenses;

    const today = new Date();
    const isCurrentMonth = period.month === today.getMonth() + 1 && period.year === today.getFullYear();
    const divisor = isCurrentMonth ? today.getDate() : daysInMonth(period);

    const topRow = topRows.at(0);
    const topCategoryRow = topRow?.categoryId
      ? await this.prisma.category.findUnique({ where: { id: topRow.categoryId } })
      : null;

    return {
      month: period.month,
      year: period.year,
      income: round(totalIncome),
      expenses: round(totalExpenses),
      balance: round(balance),
      savingsRate: totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0,
      transactionCount,
      averageDailySpend: divisor > 0 ? round(totalExpenses / divisor) : 0,
      topCategory: topCategoryRow
        ? {
            name: topCategoryRow.name,
            total: round(decimalToNumber(topRow?._sum.amount)),
            color: topCategoryRow.color,
          }
        : null,
    };
  }

  async breakdown(query: BreakdownQueryDto): Promise<{ type: string; total: number; items: BreakdownItemDto[] }> {
    const period = resolvePeriod(query);
    const date = { gte: periodStart(period), lt: periodEnd(period) };

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { type: query.type, date },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const categoryIds = grouped
      .map((row) => row.categoryId)
      .filter((id): id is number => id !== null);

    const categories = categoryIds.length
      ? await this.prisma.category.findMany({ where: { id: { in: categoryIds } } })
      : [];
    const byId = new Map(categories.map((category) => [category.id, category]));

    const total = grouped.reduce((sum, row) => sum + decimalToNumber(row._sum.amount), 0);

    const items: BreakdownItemDto[] = grouped
      .map((row) => {
        const category = row.categoryId !== null ? byId.get(row.categoryId) : undefined;
        const amount = decimalToNumber(row._sum.amount);

        return {
          categoryId: row.categoryId,
          name: category?.name ?? 'Uncategorized',
          color: category?.color ?? '#94a3b8',
          total: round(amount),
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
          count: row._count._all,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { type: query.type, total: round(total), items };
  }

  async trend(query: TrendQueryDto) {
    const end = resolvePeriod(query);

    const periods: Period[] = [];
    for (let offset = query.months - 1; offset >= 0; offset -= 1) {
      const anchor = new Date(Date.UTC(end.year, end.month - 1 - offset, 1));
      periods.push({ month: anchor.getUTCMonth() + 1, year: anchor.getUTCFullYear() });
    }

    const results = await this.prisma.$transaction(
      periods.flatMap((period) => {
        const date = { gte: periodStart(period), lt: periodEnd(period) };

        return [
          this.prisma.transaction.aggregate({ where: { type: 'INCOME', date }, _sum: { amount: true } }),
          this.prisma.transaction.aggregate({ where: { type: 'EXPENSE', date }, _sum: { amount: true } }),
        ];
      }),
    );

    return periods.map((period, index) => {
      const income = decimalToNumber(results[index * 2]?._sum.amount);
      const expenses = decimalToNumber(results[index * 2 + 1]?._sum.amount);

      return {
        key: `${period.year}-${String(period.month).padStart(2, '0')}`,
        label: monthLabel(period),
        income: round(income),
        expenses: round(expenses),
        net: round(income - expenses),
      };
    });
  }
}
