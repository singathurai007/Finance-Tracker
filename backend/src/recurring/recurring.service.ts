import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Frequency, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { CreateRecurringDto } from './dto/create-recurring.dto.js';
import { UpdateRecurringDto } from './dto/update-recurring.dto.js';

const withRelations = {
  account: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, color: true, type: true } },
} as const;

/** Stops a long-dormant rule from generating an unbounded backlog. */
const MAX_CATCH_UP_OCCURRENCES = 60;

type RecurringWithRelations = Prisma.RecurringTransactionGetPayload<{ include: typeof withRelations }>;

export interface RunDueResult {
  created: number;
  transactions: Prisma.TransactionGetPayload<{ include: typeof transactionRelations }>[];
}

const transactionRelations = {
  account: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, color: true, type: true } },
} as const;

@Injectable()
export class RecurringService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RecurringWithRelations[]> {
    return this.prisma.recurringTransaction.findMany({
      orderBy: [{ active: 'desc' }, { nextRun: 'asc' }],
      include: withRelations,
    });
  }

  async findOne(id: number): Promise<RecurringWithRelations> {
    const rule = await this.prisma.recurringTransaction.findUnique({ where: { id }, include: withRelations });

    if (!rule) {
      throw new NotFoundException(`Recurring transaction ${id} was not found`);
    }

    return rule;
  }

  async create(dto: CreateRecurringDto): Promise<RecurringWithRelations> {
    await assertRelationsExist(this.prisma, dto.accountId, dto.categoryId);

    return this.prisma.recurringTransaction.create({
      data: {
        description: dto.description.trim(),
        type: dto.type,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        frequency: dto.frequency,
        interval: dto.interval ?? 1,
        nextRun: new Date(dto.nextRun),
        active: dto.active ?? true,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
      },
      include: withRelations,
    });
  }

  async update(id: number, dto: UpdateRecurringDto): Promise<RecurringWithRelations> {
    await this.findOne(id);

    if (dto.accountId !== undefined || dto.categoryId !== undefined) {
      await assertRelationsExist(this.prisma, dto.accountId, dto.categoryId);
    }

    return this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        description: dto.description?.trim(),
        type: dto.type,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        frequency: dto.frequency,
        interval: dto.interval,
        nextRun: dto.nextRun ? new Date(dto.nextRun) : undefined,
        active: dto.active,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
      },
      include: withRelations,
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.recurringTransaction.delete({ where: { id } });
  }

  /**
   * Turns every rule whose `nextRun` has already passed into real transactions
   * (one per missed occurrence) and rolls the rule forward.
   */
  async runDue(): Promise<RunDueResult> {
    const now = new Date();
    const due = await this.prisma.recurringTransaction.findMany({
      where: { active: true, nextRun: { lte: now } },
      orderBy: { nextRun: 'asc' },
    });

    const transactions: RunDueResult['transactions'] = [];

    for (const rule of due) {
      let occurrence = rule.nextRun;
      let guard = 0;

      while (occurrence <= now && guard < MAX_CATCH_UP_OCCURRENCES) {
        transactions.push(
          await this.prisma.transaction.create({
            data: {
              type: rule.type,
              description: rule.description,
              amount: rule.amount,
              paymentMethod: rule.paymentMethod,
              notes: `Recurring (${rule.frequency.toLowerCase()})`,
              date: occurrence,
              accountId: rule.accountId,
              categoryId: rule.categoryId,
            },
            include: transactionRelations,
          }),
        );

        occurrence = advance(occurrence, rule.frequency, rule.interval);
        guard += 1;
      }

      await this.prisma.recurringTransaction.update({
        where: { id: rule.id },
        data: { lastRun: now, nextRun: occurrence },
      });
    }

    return { created: transactions.length, transactions };
  }
}

function advance(from: Date, frequency: Frequency, interval: number): Date {
  const next = new Date(from);

  switch (frequency) {
    case Frequency.DAILY:
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case Frequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7 * interval);
      break;
    case Frequency.MONTHLY:
      next.setUTCMonth(next.getUTCMonth() + interval);
      break;
    case Frequency.YEARLY:
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      break;
  }

  return next;
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
