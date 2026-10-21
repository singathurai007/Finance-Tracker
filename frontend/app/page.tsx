"use client";

import Link from "next/link";
import MonthYearPicker, { type Period } from "@/components/MonthYearPicker";
import Money from "@/components/Money";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import StatCard from "@/components/StatCard";
import { ErrorBanner, EmptyState, LoadingBlock } from "@/components/States";
import {
  getCategoryBreakdown,
  getMonthlyTrend,
  getReportSummary,
  listBudgets,
  listTransactions,
} from "@/lib/api";
import { formatDate, formatPercent, monthLabel } from "@/lib/format";
import { CARD_CLASS } from "@/lib/ui";
import { useApi } from "@/lib/useApi";
import { usePeriod } from "@/lib/usePeriod";

export default function DashboardPage() {
  const [period, setPeriod] = usePeriod();

  if (!period) {
    return (
      <>
        <PageHeader title="Dashboard" description="Track your money. Plan your future." />
        <LoadingBlock label="Loading dashboard…" />
      </>
    );
  }

  return <Dashboard period={period} onPeriodChange={setPeriod} />;
}

function Dashboard({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const { month, year } = period;

  const summary = useApi(
    () => getReportSummary(month, year),
    [month, year],
  );
  const breakdown = useApi(
    () => getCategoryBreakdown(month, year, "EXPENSE"),
    [month, year],
  );
  const budgets = useApi(() => listBudgets(month, year), [month, year]);
  const trend = useApi(() => getMonthlyTrend(6), []);
  const recent = useApi(
    () =>
      listTransactions({
        page: 1,
        pageSize: 8,
        sortBy: "date",
        sortOrder: "desc",
      }),
    [],
  );

  const periodLabel = `${monthLabel(month)} ${year}`;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Your finances for ${periodLabel}.`}
        actions={<MonthYearPicker period={period} onChange={onPeriodChange} />}
      />

      {summary.error ? (
        <div className="mb-6">
          <ErrorBanner message={summary.error} onRetry={summary.reload} />
        </div>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Balance"
          tone={summary.data && summary.data.balance < 0 ? "negative" : "primary"}
          value={
            summary.data ? (
              <Money value={summary.data.balance} />
            ) : (
              <span className="text-slate-400">—</span>
            )
          }
          hint="Income minus expenses"
        />
        <StatCard
          label="Income"
          tone="positive"
          value={
            summary.data ? (
              <Money value={summary.data.income} signed />
            ) : (
              <span className="text-slate-400">—</span>
            )
          }
          hint={`${summary.data?.transactionCount ?? 0} transactions`}
        />
        <StatCard
          label="Expenses"
          tone="negative"
          value={
            summary.data ? (
              <Money value={summary.data.expenses} />
            ) : (
              <span className="text-slate-400">—</span>
            )
          }
          hint={
            summary.data
              ? `Avg ${Math.round(summary.data.averageDailySpend)}/day`
              : undefined
          }
        />
        <StatCard
          label="Savings rate"
          value={
            summary.data ? (
              formatPercent(summary.data.savingsRate)
            ) : (
              <span className="text-slate-400">—</span>
            )
          }
          hint={
            summary.data?.topCategory
              ? `Top: ${summary.data.topCategory.name}`
              : "No spending yet"
          }
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`${CARD_CLASS} p-5`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Expenses by category
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {periodLabel}
          </p>

          <div className="mt-4">
            {breakdown.loading ? (
              <LoadingBlock label="Loading breakdown…" />
            ) : breakdown.error ? (
              <ErrorBanner message={breakdown.error} onRetry={breakdown.reload} />
            ) : breakdown.data && breakdown.data.items.length > 0 ? (
              <>
                <div
                  className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                  role="img"
                  aria-label="Expense distribution by category"
                >
                  {breakdown.data.items.map((item) => (
                    <div
                      key={item.categoryId ?? item.name}
                      title={`${item.name}: ${formatPercent(item.percentage)}`}
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  ))}
                </div>

                <ul className="mt-4 space-y-3">
                  {breakdown.data.items.map((item) => (
                    <li
                      key={item.categoryId ?? item.name}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                        {item.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatPercent(item.percentage)}
                      </span>
                      <span className="w-20 text-right font-medium text-slate-900 dark:text-slate-100">
                        <Money value={item.total} />
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                title="No expenses recorded"
                hint="Add transactions to see the breakdown."
              />
            )}
          </div>
        </section>

        <section className={`${CARD_CLASS} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Budget progress
            </h2>
            <Link href="/budgets" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
              Manage
            </Link>
          </div>

          <div className="mt-4">
            {budgets.loading ? (
              <LoadingBlock label="Loading budgets…" />
            ) : budgets.error ? (
              <ErrorBanner message={budgets.error} onRetry={budgets.reload} />
            ) : budgets.data && budgets.data.length > 0 ? (
              <ul className="space-y-4">
                {budgets.data.map((budget) => (
                  <li key={budget.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {budget.category.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        <Money value={budget.spent} /> /{" "}
                        <Money value={budget.amount} />
                      </span>
                    </div>
                    <ProgressBar
                      value={budget.percentage}
                      tone={budget.status}
                      label={`${budget.category.name} budget used`}
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {budget.status === "exceeded"
                        ? `Over by ${Math.abs(Math.round(budget.remaining))}`
                        : `${Math.round(budget.remaining)} remaining`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No budgets for this month"
                hint="Create a budget to track your spending limits."
              />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className={`${CARD_CLASS} lg:col-span-3`}>
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent transactions
            </h2>
            <Link
              href="/transactions"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            {recent.loading ? (
              <div className="px-5 pb-5">
                <LoadingBlock label="Loading transactions…" />
              </div>
            ) : recent.error ? (
              <div className="px-5 pb-5">
                <ErrorBanner message={recent.error} onRetry={recent.reload} />
              </div>
            ) : recent.data && recent.data.data.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-5 py-2 font-medium">Description</th>
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data.data.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">
                        {tx.description}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {tx.category?.name ?? "Uncategorised"}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                        {formatDate(tx.date)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${
                          tx.type === "INCOME"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "−"}
                        <Money value={tx.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-5 pb-5">
                <EmptyState title="No transactions yet" />
              </div>
            )}
          </div>
        </section>

        <section className={`${CARD_CLASS} p-5 lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Last 6 months
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Income vs expenses
          </p>

          <div className="mt-4">
            {trend.loading ? (
              <LoadingBlock label="Loading trend…" />
            ) : trend.error ? (
              <ErrorBanner message={trend.error} onRetry={trend.reload} />
            ) : trend.data && trend.data.length > 0 ? (
              <TrendChart points={trend.data} />
            ) : (
              <EmptyState title="No trend data" />
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        PaisaTrack · Data from the local API at <span className="font-mono">/api</span>
      </p>
    </>
  );
}

function TrendChart({
  points,
}: {
  points: { key: string; label: string; income: number; expenses: number }[];
}) {
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.income, point.expenses]),
  );

  return (
    <div>
      <div className="flex h-40 items-end justify-between gap-2">
        {points.map((point) => (
          <div
            key={point.key}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-4 rounded-t bg-emerald-500"
                style={{ height: `${(point.income / max) * 100}%` }}
                title={`Income: ${Math.round(point.income)}`}
              />
              <div
                className="w-1/2 max-w-4 rounded-t bg-rose-500"
                style={{ height: `${(point.expenses / max) * 100}%` }}
                title={`Expenses: ${Math.round(point.expenses)}`}
              />
            </div>
            <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
              {point.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
          Expenses
        </span>
      </div>
    </div>
  );
}
