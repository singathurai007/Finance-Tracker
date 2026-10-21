# PaisaTrack Web

Next.js front end for PaisaTrack, a personal finance manager.

## Features

- Dashboard with monthly income, expenses, balance, savings rate and top category
- Transactions: filter by type, account, category, payment method, date range and search text; create, edit, delete; export the current filter to CSV
- Accounts: cash, bank, savings, credit card and wallet, each with its own balance
- Budgets: monthly limits per category with progress and `ok` / `warning` / `exceeded` status
- Recurring transactions: manage rules and run all due occurrences
- Settings: manage categories and the colour theme
- Light and dark mode, remembered across visits
- Responsive layout for mobile, tablet and desktop

## Requirements

- Node.js 22 or newer
- The PaisaTrack API running (see `../backend/README.md`)

## Setup

```bash
npm install
```

## Run

Start the API first, then:

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # lint
```

## How it talks to the API

`next.config.ts` rewrites `/api/:path*` to `http://localhost:3001/api/:path*`, so the browser only ever calls the front end origin. There is no API base URL to configure and no CORS setup is required.

To point the front end at a different API host, change the destination in `next.config.ts`.
