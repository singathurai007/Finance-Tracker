# PaisaTrack

A self-hosted personal finance manager — track where your money comes from and where it goes, across multiple accounts, budgets and recurring payments.

PaisaTrack is a full-stack application: a **NestJS + Prisma + PostgreSQL** REST API behind a **Next.js 16** dashboard. It runs entirely on your own machine, so your financial data never leaves your control.

---

## Why

Most budgeting apps keep your data on someone else's server. PaisaTrack is built to be self-hosted: you own the database, you own the data, and you can export everything at any time.

It solves the everyday problems of personal money management:

- You do not know how much you actually spent this month until it is over.
- Cash, two bank accounts and a credit card are impossible to track together.
- Salary, rent and EMI dates are easy to forget.
- Spreadsheets get abandoned after two weeks because entering data is tedious.

---

## Features

**Accounts**
Track Cash, Bank, Savings, Credit Card and Wallet separately. Each account reports its own income, expenses and running balance, so you always know which pocket the money is in.

**Transactions**
Full CRUD with filtering by type, account, category, payment method and date range, plus free-text search over the description and notes. Paginated server-side, and every list shows the income / expense / net totals for the current filter.

**Budgets**
Set a monthly limit per category. Each budget returns `spent`, `remaining`, `percentage` and a status of `ok`, `warning` or `exceeded`, so overspending is visible immediately instead of at month end.

**Recurring transactions**
Define a rule (daily, weekly, monthly or yearly, with a custom interval) for salary, rent, subscriptions or EMIs. `POST /recurring/run-due` materialises every occurrence that has been missed since the rule was last run and advances the next run date.

**Reports**
Monthly summary (income, expenses, balance, savings rate, top category), category breakdown, and a monthly trend for the last several months.

**CSV export**
Download the currently filtered transaction list as CSV. The file is written with a UTF-8 BOM and the correct `Content-Disposition` header, so Excel and Sheets open it with no import wizard.

**Audit and error log**
A global interceptor records every successful write, and a global exception filter records every 4xx and 5xx response. The log is queryable through `GET /api/audit-logs`, which turns "what broke and when" into a single request instead of a guess.

**Dark and light mode**
Theme is chosen by the user and applied before first paint, so there is no flash of the wrong theme on load.

**Responsive UI**
Mobile (sidebar collapses into a drawer), tablet and desktop (sidebar collapses into an icon rail). The layout is CSS-driven with no chart library dependency.

---

## Tech stack

### Backend

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | NestJS | `^12.0.1` |
| Language | TypeScript (ESM) | `^6.0.2` |
| ORM | Prisma | `^7.10.1` |
| Database driver | `@prisma/adapter-pg` over `pg` | `^7.10.1` / `^8.23.1` |
| Database | PostgreSQL | 14+ |
| Validation | `class-validator` + `class-transformer` | `^0.15.1` / `^0.5.1` |
| Observability | `@nestjs/observe` | `^0.1.8` |
| Testing | Vitest (+ Supertest for e2e) | `^4.1.2` |
| Linting | oxlint | `^1.58.0` |
| Seed runner | tsx | `^4.23.15` |

### Frontend

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | `16.4.2` |
| UI library | React | `19.3.0` |
| Styling | Tailwind CSS (via `@tailwindcss/turbopack`) | `^4` |
| Language | TypeScript | `^5` |
| Linting | ESLint + `eslint-config-next` | `^9` |

No state-management library, no data-fetching library and no chart library — the app uses React primitives and CSS only.

---

## Architecture

```
┌──────────────┐   HTTP   ┌────────────────────┐  rewrite   ┌─────────────────────┐
│   Browser    │ ───────► │  Next.js  :3000    │ ─────────► │  NestJS API  :3001  │
│              │ ◄─────── │  App Router + RSC  │ ◄───────── │  prefix: /api       │
└──────────────┘          └────────────────────┘            └──────────┬──────────┘
                                                                       │
                                                          Prisma 7 client (ESM)
                                                                       │
                                                            ┌──────────▼──────────┐
                                                            │    PostgreSQL       │
                                                            └─────────────────────┘
```

The browser only ever talks to the Next.js origin. `next.config.ts` rewrites `/api/:path*` to the API, which means there is **no API base URL to configure and no CORS setup required**.

Request flow inside the API:

```
Request
  → ValidationPipe            (whitelist, transform, implicit conversion)
  → Controller                (route + DTO)
  → Service                   (business logic + Prisma)
  → DecimalSerializerInterceptor   (Prisma Decimal → number)
  → AuditInterceptor          (records POST/PATCH/DELETE to the audit log)
Response
  ↘ AllExceptionsFilter       (uniform error shape, logs 4xx as WARN, 5xx as ERROR)
```

---

## Project structure

```
finance-tracker/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # 6 models, 5 enums
│   │   ├── migrations/            # versioned SQL migrations
│   │   └── seed.ts                # idempotent demo data
│   ├── src/
│   │   ├── accounts/              # controller + service + DTOs per feature
│   │   ├── categories/
│   │   ├── transactions/          # filtering, pagination, CSV export
│   │   ├── budgets/               # spent / remaining / percentage / status
│   │   ├── recurring/             # rules + catch-up of missed occurrences
│   │   ├── reports/               # summary, category breakdown, monthly trend
│   │   ├── audit/                 # audit log service + query endpoint
│   │   ├── common/
│   │   │   ├── dto/               # shared pagination DTO
│   │   │   ├── filters/           # global exception filter
│   │   │   ├── interceptors/      # decimal serializer, audit
│   │   │   ├── money.ts           # rounding helpers
│   │   │   ├── period.ts          # UTC-safe month / range helpers
│   │   │   └── prisma-errors.ts   # P2002 / P2003 / P2025 detection
│   │   ├── prisma.service.ts      # PrismaClient + pg driver adapter
│   │   └── main.ts                # bootstrap, global pipe, prefix, CORS
│   └── prisma7.config.ts          # Prisma 7 config (datasource url, seed)
│
└── frontend/
    ├── app/
    │   ├── page.tsx               # dashboard
    │   ├── transactions/page.tsx
    │   ├── accounts/page.tsx
    │   ├── budgets/page.tsx
    │   ├── recurring/page.tsx
    │   ├── settings/page.tsx
    │   ├── layout.tsx             # shell + pre-paint theme script
    │   └── globals.css            # Tailwind + theme tokens
    ├── components/                # AppShell, Sidebar, Modal, TransactionForm,
    │                              # Money, StatCard, ProgressBar, ThemeToggle, ...
    ├── lib/                       # api client, hooks, formatting, stores
    └── next.config.ts             # /api rewrite to the backend
```

---

## Getting started

### Prerequisites

- **Node.js 22 or newer**
- **PostgreSQL 14 or newer**, running locally

### 1. Clone

```bash
git clone https://github.com/singathurai007/Finance-Tracker.git
cd Finance-Tracker
```

### 2. Create the database

```bash
psql -U postgres -c "CREATE DATABASE finance_tracker;"
```

### 3. Start the API

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/finance_tracker?schema=public"
PORT=3001
```

Special characters in the password must be URL-encoded — for example `@` becomes `%40`, otherwise the connection string is parsed incorrectly.

Then apply the schema and load demo data:

```bash
npx prisma migrate dev     # create tables
npx prisma generate        # generate the Prisma client
npm run seed               # idempotent demo data
npm run start:dev          # http://localhost:3001/api
```

### 4. Start the web app

In a second terminal:

```bash
cd frontend
npm install
npm run dev                # http://localhost:3000
```

Open `http://localhost:3000`.

---

## Environment variables

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | — | PostgreSQL connection string |
| `PORT` | `backend/.env` | `3001` | API port |

The frontend needs no environment variables — the API location is a build-time rewrite in `next.config.ts`.

---

## API reference

Base URL: `http://localhost:3001/api`

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/health` | Service status and timestamp |
| `GET` `POST` | `/accounts` | `GET` `PATCH` `DELETE` `/accounts/:id` |
| `GET` `POST` | `/categories` | `GET` `PATCH` `DELETE` `/categories/:id` |
| `GET` `POST` | `/transactions` | Filters: `type`, `accountId`, `categoryId`, `paymentMethod`, `from`, `to`, `search`, `page`, `pageSize` |
| `GET` `PATCH` `DELETE` | `/transactions/:id` | Single transaction |
| `GET` | `/transactions/export` | CSV download of the filtered list |
| `GET` `POST` | `/budgets` | Filters: `month`, `year`; `GET` `PATCH` `DELETE` `/budgets/:id` |
| `GET` `POST` | `/recurring` | `GET` `PATCH` `DELETE` `/recurring/:id` |
| `POST` | `/recurring/run-due` | Materialise all due occurrences |
| `GET` | `/reports/summary` | Income, expenses, balance, savings rate, top category |
| `GET` | `/reports/category-breakdown` | Totals per category |
| `GET` | `/reports/monthly-trend` | Monthly income and expenses |
| `GET` | `/audit-logs` | Filters: `level`, `page`, `pageSize` |

### Conventions

- Money is returned as **plain numbers**, never as a serialised decimal object.
- Validation failures return `400` with a `message` array.
- Conflicting writes return `409` — duplicate category name, duplicate budget for the same category and month, or deleting an account that still has transactions.
- Every 4xx and 5xx response is written to the audit log with level `WARN` or `ERROR`.

---

## Data model

Six models and five enums:

| Model | Purpose |
| --- | --- |
| `Account` | A wallet with a type, opening balance and currency |
| `Category` | Income or expense category with a colour |
| `Transaction` | A single income or expense entry |
| `Budget` | Monthly limit per category, unique on `(categoryId, month, year)` |
| `RecurringTransaction` | A schedule that generates transactions |
| `AuditLog` | Write actions and HTTP errors, with level, entity and JSON metadata |

| Enum | Values |
| --- | --- |
| `TransactionType` | `INCOME`, `EXPENSE` |
| `AccountType` | `CASH`, `BANK`, `SAVINGS`, `CREDIT_CARD`, `WALLET` |
| `PaymentMethod` | `CASH`, `UPI`, `DEBIT_CARD`, `CREDIT_CARD`, `NET_BANKING`, `OTHER` |
| `Frequency` | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `LogLevel` | `INFO`, `WARN`, `ERROR` |

Money is stored as `Decimal(12, 2)` in PostgreSQL and rounded to paise at the boundary, so totals never drift through floating-point error. Deleting a category sets its transactions' category to `NULL` rather than destroying history.

---

## Available scripts

### Backend (`cd backend`)

| Script | Description |
| --- | --- |
| `npm run start:dev` | Watch mode |
| `npm run start` | Single run |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run seed` | Load idempotent demo data |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Coverage report |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format with Prettier |

### Frontend (`cd frontend`)

| Script | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

---

## Engineering notes

A few decisions worth calling out:

- **Decimal serialisation.** Prisma returns `Decimal` objects that `JSON.stringify` turns into `{"s":1,"e":2,"d":[...]}`. A global interceptor walks every response and converts them to plain numbers using `Prisma.Decimal.isDecimal`, so the frontend never has to know about Prisma.
- **Audit without polluting services.** Recording is done by an interceptor and an exception filter, so no service contains logging code. Adding a new write endpoint gets auditing for free.
- **UTC-based period helpers.** Month boundaries, "days in month" and date-range resolution live in one module and are computed in UTC, which avoids the off-by-one-day bugs that appear when a server and a browser disagree about time zones.
- **Catch-up with a guard.** Recurring rules advance one interval at a time and stop after 60 iterations, so a rule left in the past cannot spin forever while still backfilling what it owes.
- **CSV that Excel understands.** The export is prefixed with a UTF-8 BOM and sent with `Content-Disposition: attachment`; without the BOM, non-ASCII descriptions are mangled on open.
- **No flash of the wrong theme.** A small inline script in the layout applies the stored theme and sidebar state to `<html>` before the first paint.
- **Proxy instead of CORS.** Browser requests stay same-origin; Next.js forwards `/api/*` to the API. No CORS configuration to get wrong.

---

## Roadmap

- Authentication and multi-user support (the schema is single-user today)
- Notifications for budget limits and upcoming recurring payments
- Docker Compose for one-command local setup
- An audit log page in the UI (currently API-only)
- Automated deployment pipeline

---

## Author

**Singathurai** — Software, Cloud and DevOps Engineer

- GitHub: [@singathurai007](https://github.com/singathurai007)
- Email: cmsingathurai@gmail.com

## License

No license has been added yet. Until one is, all rights are reserved by the author.
