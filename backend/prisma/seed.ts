import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AccountType,
  Frequency,
  PaymentMethod,
  PrismaClient,
  TransactionType,
} from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CATEGORIES = [
  { name: 'Salary', type: TransactionType.INCOME, color: '#059669' },
  { name: 'Freelance', type: TransactionType.INCOME, color: '#10b981' },
  { name: 'Housing', type: TransactionType.EXPENSE, color: '#dc2626' },
  { name: 'Food', type: TransactionType.EXPENSE, color: '#f59e0b' },
  { name: 'Transport', type: TransactionType.EXPENSE, color: '#3b82f6' },
  { name: 'Bills', type: TransactionType.EXPENSE, color: '#8b5cf6' },
  { name: 'Shopping', type: TransactionType.EXPENSE, color: '#ec4899' },
  { name: 'Health', type: TransactionType.EXPENSE, color: '#14b8a6' },
];

const ACCOUNTS = [
  { name: 'Cash Wallet', type: AccountType.CASH, openingBalance: 2500 },
  { name: 'HDFC Savings', type: AccountType.SAVINGS, openingBalance: 48000 },
  { name: 'ICICI Current', type: AccountType.BANK, openingBalance: 15000 },
  { name: 'HDFC Credit Card', type: AccountType.CREDIT_CARD, openingBalance: 0 },
];

const BUDGETS = [
  { category: 'Housing', amount: 8000 },
  { category: 'Food', amount: 6000 },
  { category: 'Transport', amount: 3000 },
  { category: 'Bills', amount: 2500 },
  { category: 'Shopping', amount: 4000 },
  { category: 'Health', amount: 2000 },
];

interface TransactionTemplate {
  description: string;
  type: TransactionType;
  amount: number;
  category: string;
  account: string;
  paymentMethod: PaymentMethod;
  day: number;
}

const MONTHLY_TRANSACTIONS: TransactionTemplate[] = [
  { description: 'Monthly Salary', type: TransactionType.INCOME, amount: 25000, category: 'Salary', account: 'HDFC Savings', paymentMethod: PaymentMethod.NET_BANKING, day: 1 },
  { description: 'Freelance Project', type: TransactionType.INCOME, amount: 4500, category: 'Freelance', account: 'ICICI Current', paymentMethod: PaymentMethod.NET_BANKING, day: 8 },
  { description: 'House Rent', type: TransactionType.EXPENSE, amount: 6000, category: 'Housing', account: 'HDFC Savings', paymentMethod: PaymentMethod.NET_BANKING, day: 3 },
  { description: 'Grocery Shopping', type: TransactionType.EXPENSE, amount: 1850, category: 'Food', account: 'Cash Wallet', paymentMethod: PaymentMethod.CASH, day: 5 },
  { description: 'Dining Out', type: TransactionType.EXPENSE, amount: 900, category: 'Food', account: 'HDFC Credit Card', paymentMethod: PaymentMethod.CREDIT_CARD, day: 12 },
  { description: 'Petrol', type: TransactionType.EXPENSE, amount: 1200, category: 'Transport', account: 'ICICI Current', paymentMethod: PaymentMethod.UPI, day: 7 },
  { description: 'Internet Bill', type: TransactionType.EXPENSE, amount: 800, category: 'Bills', account: 'HDFC Savings', paymentMethod: PaymentMethod.UPI, day: 10 },
  { description: 'Electricity Bill', type: TransactionType.EXPENSE, amount: 1150, category: 'Bills', account: 'HDFC Savings', paymentMethod: PaymentMethod.UPI, day: 15 },
  { description: 'New Headphones', type: TransactionType.EXPENSE, amount: 2499, category: 'Shopping', account: 'HDFC Credit Card', paymentMethod: PaymentMethod.DEBIT_CARD, day: 18 },
  { description: 'Pharmacy', type: TransactionType.EXPENSE, amount: 640, category: 'Health', account: 'Cash Wallet', paymentMethod: PaymentMethod.CASH, day: 21 },
  { description: 'Grocery Top-up', type: TransactionType.EXPENSE, amount: 1250, category: 'Food', account: 'Cash Wallet', paymentMethod: PaymentMethod.UPI, day: 24 },
];

function relativeMonth(offset: number): { month: number; year: number } {
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return { month: anchor.getUTCMonth() + 1, year: anchor.getUTCFullYear() };
}

function dayOf(period: { month: number; year: number }, day: number): Date {
  const lastDay = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  return new Date(Date.UTC(period.year, period.month - 1, Math.min(day, lastDay)));
}

async function seedCategories(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();

  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { name: category.name },
      update: { type: category.type, color: category.color },
      create: category,
    });
    ids.set(row.name, row.id);
  }

  return ids;
}

async function seedAccounts(): Promise<Map<string, number>> {
  if ((await prisma.account.count()) === 0) {
    await prisma.account.createMany({ data: ACCOUNTS });
  }

  const accounts = await prisma.account.findMany();
  return new Map(accounts.map((account) => [account.name, account.id]));
}

async function seedBudgets(categoryIds: Map<string, number>): Promise<number> {
  let created = 0;

  for (const offset of [-2, -1, 0]) {
    const period = relativeMonth(offset);

    for (const budget of BUDGETS) {
      const categoryId = categoryIds.get(budget.category);
      if (categoryId === undefined) {
        continue;
      }

      await prisma.budget.upsert({
        where: { categoryId_month_year: { categoryId, month: period.month, year: period.year } },
        update: { amount: budget.amount },
        create: { categoryId, amount: budget.amount, month: period.month, year: period.year },
      });
      created += 1;
    }
  }

  return created;
}

async function seedTransactions(categoryIds: Map<string, number>, accountIds: Map<string, number>): Promise<number> {
  if ((await prisma.transaction.count()) > 0) {
    return 0;
  }

  const now = new Date();
  let created = 0;

  for (const offset of [-2, -1, 0]) {
    const period = relativeMonth(offset);

    for (const template of MONTHLY_TRANSACTIONS) {
      const date = dayOf(period, template.day);
      const accountId = accountIds.get(template.account);

      // Never seed transactions in the future.
      if (date > now || accountId === undefined) {
        continue;
      }

      await prisma.transaction.create({
        data: {
          type: template.type,
          description: template.description,
          amount: template.amount,
          paymentMethod: template.paymentMethod,
          date,
          accountId,
          categoryId: categoryIds.get(template.category) ?? null,
        },
      });
      created += 1;
    }
  }

  return created;
}

async function seedRecurring(categoryIds: Map<string, number>, accountIds: Map<string, number>): Promise<number> {
  if ((await prisma.recurringTransaction.count()) > 0) {
    return 0;
  }

  const nextMonth = relativeMonth(1);
  const dueDate = new Date();
  dueDate.setUTCDate(dueDate.getUTCDate() - 10);

  const rules = [
    { description: 'Monthly Salary', type: TransactionType.INCOME, amount: 25000, category: 'Salary', account: 'HDFC Savings', paymentMethod: PaymentMethod.NET_BANKING, frequency: Frequency.MONTHLY, nextRun: dayOf(nextMonth, 1) },
    { description: 'House Rent', type: TransactionType.EXPENSE, amount: 6000, category: 'Housing', account: 'HDFC Savings', paymentMethod: PaymentMethod.NET_BANKING, frequency: Frequency.MONTHLY, nextRun: dayOf(nextMonth, 3) },
    { description: 'Gym Membership', type: TransactionType.EXPENSE, amount: 1200, category: 'Health', account: 'HDFC Credit Card', paymentMethod: PaymentMethod.CREDIT_CARD, frequency: Frequency.MONTHLY, nextRun: dayOf(nextMonth, 5) },
    // Left in the past on purpose so "Run due" has something to materialise.
    { description: 'Internet Bill', type: TransactionType.EXPENSE, amount: 800, category: 'Bills', account: 'HDFC Savings', paymentMethod: PaymentMethod.UPI, frequency: Frequency.MONTHLY, nextRun: dueDate },
  ];

  let created = 0;

  for (const rule of rules) {
    const accountId = accountIds.get(rule.account);
    if (accountId === undefined) {
      continue;
    }

    await prisma.recurringTransaction.create({
      data: {
        description: rule.description,
        type: rule.type,
        amount: rule.amount,
        paymentMethod: rule.paymentMethod,
        frequency: rule.frequency,
        nextRun: rule.nextRun,
        accountId,
        categoryId: categoryIds.get(rule.category) ?? null,
      },
    });
    created += 1;
  }

  return created;
}

async function main(): Promise<void> {
  const categoryIds = await seedCategories();
  const accountIds = await seedAccounts();
  const budgets = await seedBudgets(categoryIds);
  const transactions = await seedTransactions(categoryIds, accountIds);
  const recurring = await seedRecurring(categoryIds, accountIds);

  console.log(
    `Seed complete: ${categoryIds.size} categories, ${accountIds.size} accounts, ` +
      `${budgets} budgets, ${transactions} new transactions, ${recurring} recurring rules.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
