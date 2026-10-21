import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decimalToNumber, round } from '../common/money.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { QueryTransactionsDto } from './dto/query-transactions.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';

const withRelations = {
  account: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, color: true, type: true } },
} as const;

type TransactionWithRelations = Prisma.TransactionGetPayload<{ include: typeof withRelations }>;

export interface TransactionPage {
  data: TransactionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: { income: number; expenses: number; net: number };
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryTransactionsDto): Promise<TransactionPage> {
    const where = buildWhere(query);
    const { page, pageSize } = query;

    const [data, total, income, expenses] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: orderBy(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: withRelations,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({ where: { ...where, type: 'INCOME' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { ...where, type: 'EXPENSE' }, _sum: { amount: true } }),
    ]);

    const totalIncome = decimalToNumber(income._sum.amount);
    const totalExpenses = decimalToNumber(expenses._sum.amount);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      totals: {
        income: round(totalIncome),
        expenses: round(totalExpenses),
        net: round(totalIncome - totalExpenses),
      },
    };
  }

  async findOne(id: number): Promise<TransactionWithRelations> {
    const transaction = await this.prisma.transaction.findUnique({ where: { id }, include: withRelations });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} was not found`);
    }

    return transaction;
  }

  async create(dto: CreateTransactionDto): Promise<TransactionWithRelations> {
    await assertRelationsExist(this.prisma, dto.accountId, dto.categoryId);

    return this.prisma.transaction.create({
      data: {
        type: dto.type,
        description: dto.description.trim(),
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes?.trim(),
        date: dto.date ? new Date(dto.date) : undefined,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
      },
      include: withRelations,
    });
  }

  async update(id: number, dto: UpdateTransactionDto): Promise<TransactionWithRelations> {
    await this.findOne(id);

    if (dto.accountId !== undefined || dto.categoryId !== undefined) {
      await assertRelationsExist(this.prisma, dto.accountId, dto.categoryId);
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description?.trim(),
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes?.trim(),
        date: dto.date ? new Date(dto.date) : undefined,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
      },
      include: withRelations,
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  /** CSV lives here so the export always honours the same filters as the list. */
  async exportCsv(query: QueryTransactionsDto): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: buildWhere(query),
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: withRelations,
    });

    const rows: string[][] = [
      ['Date', 'Type', 'Description', 'Category', 'Account', 'Payment Method', 'Amount', 'Notes'],
      ...transactions.map((transaction) => [
        transaction.date.toISOString().slice(0, 10),
        transaction.type,
        transaction.description,
        transaction.category?.name ?? 'Uncategorized',
        transaction.account?.name ?? '',
        transaction.paymentMethod,
        transaction.amount.toFixed(2),
        transaction.notes ?? '',
      ]),
    ];

    return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  }
}

function orderBy(query: QueryTransactionsDto): Prisma.TransactionOrderByWithRelationInput[] {
  const { sortBy, sortOrder } = query;

  if (sortBy === 'amount') {
    return [{ amount: sortOrder }, { id: 'desc' }];
  }
  if (sortBy === 'description') {
    return [{ description: sortOrder }, { id: 'desc' }];
  }
  if (sortBy === 'createdAt') {
    return [{ createdAt: sortOrder }, { id: 'desc' }];
  }
  return [{ date: sortOrder }, { id: 'desc' }];
}

function buildWhere(query: QueryTransactionsDto): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (query.type) {
    where.type = query.type;
  }
  if (query.categoryId !== undefined) {
    where.categoryId = query.categoryId;
  }
  if (query.accountId !== undefined) {
    where.accountId = query.accountId;
  }
  if (query.search) {
    where.OR = [
      { description: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const date: Prisma.DateTimeFilter = {};
  if (query.from) {
    date.gte = new Date(query.from);
  }
  if (query.to) {
    const to = new Date(query.to);
    // A date-only value means "up to and including this day".
    if (!query.to.includes('T')) {
      to.setUTCHours(23, 59, 59, 999);
    }
    date.lte = to;
  }
  if (Object.keys(date).length > 0) {
    where.date = date;
  }

  return where;
}

async function assertRelationsExist(
  prisma: PrismaService,
  accountId?: number,
  categoryId?: number,
): Promise<void> {
  if (accountId !== undefined) {
    const account = await prisma.account.count({ where: { id: accountId } });
    if (account === 0) {
      throw new BadRequestException(`Account ${accountId} does not exist`);
    }
  }

  if (categoryId !== undefined) {
    const category = await prisma.category.count({ where: { id: categoryId } });
    if (category === 0) {
      throw new BadRequestException(`Category ${categoryId} does not exist`);
    }
  }
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
