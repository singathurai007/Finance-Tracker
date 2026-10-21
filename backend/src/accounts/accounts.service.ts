import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { round } from '../common/money.js';
import { AccountType, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';

const withTotals = {
  transactions: { select: { type: true, amount: true } },
} as const;

type AccountWithTotals = Prisma.AccountGetPayload<{ include: typeof withTotals }>;

export interface AccountDto {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  archived: boolean;
  openingBalance: number;
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AccountDto[]> {
    const accounts = await this.prisma.account.findMany({
      orderBy: [{ archived: 'asc' }, { name: 'asc' }],
      include: withTotals,
    });

    return accounts.map(toAccountDto);
  }

  async findOne(id: number): Promise<AccountDto> {
    const account = await this.prisma.account.findUnique({ where: { id }, include: withTotals });

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    return toAccountDto(account);
  }

  async create(dto: CreateAccountDto): Promise<AccountDto> {
    const account = await this.prisma.account.create({
      data: {
        name: dto.name.trim(),
        type: dto.type ?? AccountType.CASH,
        openingBalance: dto.openingBalance ?? 0,
        currency: dto.currency ?? 'INR',
      },
      include: withTotals,
    });

    return toAccountDto(account);
  }

  async update(id: number, dto: UpdateAccountDto): Promise<AccountDto> {
    await this.ensureExists(id);

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        openingBalance: dto.openingBalance,
        currency: dto.currency,
        archived: dto.archived,
      },
      include: withTotals,
    });

    return toAccountDto(account);
  }

  async remove(id: number): Promise<void> {
    const account = await this.findOne(id);

    if (account.transactionCount > 0) {
      throw new ConflictException(
        `"${account.name}" still has ${account.transactionCount} transaction(s). Delete or move them first.`,
      );
    }

    await this.prisma.account.delete({ where: { id } });
  }

  private async ensureExists(id: number): Promise<void> {
    const count = await this.prisma.account.count({ where: { id } });

    if (count === 0) {
      throw new NotFoundException(`Account ${id} was not found`);
    }
  }
}

function toAccountDto(account: AccountWithTotals): AccountDto {
  const income = account.transactions
    .filter((transaction) => transaction.type === 'INCOME')
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);

  const expenses = account.transactions
    .filter((transaction) => transaction.type === 'EXPENSE')
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);

  const openingBalance = account.openingBalance.toNumber();

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    archived: account.archived,
    openingBalance: round(openingBalance),
    income: round(income),
    expenses: round(expenses),
    balance: round(openingBalance + income - expenses),
    transactionCount: account.transactions.length,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
