# PaisaTrack API

REST API for PaisaTrack, a personal finance manager. Built with NestJS, Prisma 7 and PostgreSQL.

## Features

- Accounts (cash, bank, savings, credit card, wallet) with per-account balance, income and expense totals
- Categories for income and expenses
- Transactions with filtering, pagination, search and CSV export
- Monthly budgets with spent / remaining / percentage / status (`ok`, `warning`, `exceeded`)
- Recurring transactions (daily, weekly, monthly, yearly) with catch-up of missed occurrences
- Reports: monthly summary, category breakdown, monthly trend
- Audit log of every write and every HTTP error, queryable via `GET /api/audit-logs`

## Requirements

- Node.js 22 or newer
- A running PostgreSQL instance

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in this folder:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/finance_tracker?schema=public"
   PORT=3001
   ```

   Special characters in the password must be URL-encoded (`@` becomes `%40`).

3. Apply migrations and generate the Prisma client:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Seed the database with realistic demo data (idempotent, safe to re-run):

   ```bash
   npm run seed
   ```

## Run

```bash
npm run start:dev   # watch mode
npm run start       # single run
npm run build       # compile to dist/
npm run start:prod  # run the compiled build
```

The API listens on `http://localhost:3001/api`.

## Test

```bash
npm run test        # unit tests
npm run test:e2e    # end-to-end tests
npm run test:cov    # coverage
```

## API

Base URL: `http://localhost:3001/api`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Service status |
| GET, POST | `/accounts` | `GET /accounts/:id`, `PATCH`, `DELETE` |
| GET, POST | `/categories` | `GET /categories/:id`, `PATCH`, `DELETE` |
| GET, POST | `/transactions` | Filters: `type`, `accountId`, `categoryId`, `paymentMethod`, `from`, `to`, `search`, `page`, `pageSize` |
| GET | `/transactions/export` | CSV download of the filtered transactions |
| GET, POST | `/budgets` | Filter by `month`, `year`; `GET /budgets/:id`, `PATCH`, `DELETE` |
| GET, POST | `/recurring` | `POST /recurring/run-due` materializes due occurrences |
| GET | `/reports/summary` | Income, expenses, balance, savings rate, top category |
| GET | `/reports/category-breakdown` | Totals per category |
| GET | `/reports/monthly-trend` | Monthly income and expenses |
| GET | `/audit-logs` | Filters: `level`, `page`, `pageSize` |

Money is returned as plain numbers. Conventions:

- Requests with invalid input return `400` with a `message` array of validation errors.
- Conflicting writes (duplicate category name, duplicate budget) return `409`.
- Deleting an account that still has transactions returns `409`.
- Every `4xx` / `5xx` response is recorded in the audit log with level `WARN` / `ERROR`.

## Notes

- Prisma 7 does not generate the client automatically; run `npx prisma generate` after changing the schema.
- The generated client lives in `src/generated/prisma` and is committed as part of the source tree.
