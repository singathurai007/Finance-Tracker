"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import Money from "@/components/Money";
import MonthYearPicker, { type Period } from "@/components/MonthYearPicker";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/States";
import {
  createBudget,
  deleteBudget,
  listBudgets,
  listCategories,
  updateBudget,
  type Budget,
  type Category,
} from "@/lib/api";
import { monthLabel } from "@/lib/format";
import {
  BTN_DANGER,
  BTN_OUTLINE,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_CLASS,
  FIELD_CLASS,
  LABEL_CLASS,
  PILL_CLASS,
} from "@/lib/ui";
import { useApi } from "@/lib/useApi";
import { usePeriod } from "@/lib/usePeriod";

const STATUS_STYLE: Record<Budget["status"], string> = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  exceeded: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const STATUS_LABEL: Record<Budget["status"], string> = {
  ok: "On track",
  warning: "Watch out",
  exceeded: "Exceeded",
};

export default function BudgetsPage() {
  const [period, setPeriod] = usePeriod();

  if (!period) {
    return (
      <>
        <PageHeader title="Budgets" description="Set monthly spending limits per category." />
        <LoadingBlock label="Loading budgets…" />
      </>
    );
  }

  return <Budgets period={period} onPeriodChange={setPeriod} />;
}

function Budgets({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  const { month, year } = period;
  const budgets = useApi(() => listBudgets(month, year), [month, year]);
  const categories = useApi(() => listCategories(), []);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteBudget(deleting.id);
      setDeleting(null);
      budgets.reload();
    } catch (err) {
      setDeleting(null);
      setActionError(
        err instanceof Error ? err.message : "Could not delete budget.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        description={`Spending limits for ${monthLabel(month)} ${year}.`}
        actions={
          <>
            <MonthYearPicker period={period} onChange={onPeriodChange} />
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => {
                setEditing(null);
                setActionError(null);
                setFormOpen(true);
              }}
            >
              + Add budget
            </button>
          </>
        }
      />

      {actionError || budgets.error ? (
        <div className="mb-4">
          <ErrorBanner
            message={actionError ?? budgets.error ?? ""}
            onRetry={actionError ? undefined : budgets.reload}
          />
        </div>
      ) : null}

      {budgets.loading ? (
        <LoadingBlock label="Loading budgets…" />
      ) : budgets.data && budgets.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
          {budgets.data.map((budget) => (
            <article key={budget.id} className={`${CARD_CLASS} p-3 md:p-5`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 md:text-base dark:text-slate-100">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full md:h-3 md:w-3"
                    style={{ backgroundColor: budget.category.color }}
                  />
                  <span className="truncate">{budget.category.name}</span>
                </h2>
                <span
                  className={`${PILL_CLASS} shrink-0 ${STATUS_STYLE[budget.status]}`}
                >
                  {STATUS_LABEL[budget.status]}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500 md:mt-3 md:text-sm dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  <Money value={budget.spent} />
                </span>{" "}
                of <Money value={budget.amount} /> spent
              </p>

              <div className="mt-2 md:mt-3">
                <ProgressBar
                  value={budget.percentage}
                  tone={budget.status}
                  label={`${budget.category.name} budget used`}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 md:mt-2 md:text-xs dark:text-slate-400">
                <span>{Math.round(budget.percentage)}%</span>
                <span className="truncate">
                  {budget.status === "exceeded"
                    ? `Over by ${Math.abs(Math.round(budget.remaining))}`
                    : `${Math.round(budget.remaining)} remaining`}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-5">
                <button
                  type="button"
                  className={`${BTN_OUTLINE} grow md:px-4 md:py-2`}
                  onClick={() => {
                    setEditing(budget);
                    setActionError(null);
                    setFormOpen(true);
                  }}
                >
                  Edit<span className="max-md:hidden"> amount</span>
                </button>
                <button
                  type="button"
                  className={BTN_DANGER}
                  onClick={() => setDeleting(budget)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No budgets for this month"
          hint="Add a budget to start tracking your limits."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit budget" : "Add budget"}
      >
        <BudgetForm
          key={editing?.id ?? `new-${month}-${year}`}
          editing={editing}
          month={month}
          year={year}
          categories={categories.data ?? []}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            budgets.reload();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete budget"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Delete the budget for{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {deleting?.category.name}
          </span>
          ? This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={deleteBusy}
            onClick={() => setDeleting(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleteBusy}
            className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleteBusy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function BudgetForm({
  editing,
  month,
  year,
  categories,
  onSaved,
  onCancel,
}: {
  editing: Budget | null;
  month: number;
  year: number;
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState(
    editing ? String(editing.categoryId) : "",
  );
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = categories.filter(
    (category) => category.type === "EXPENSE",
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    if (!editing && !categoryId) {
      setError("Please choose a category.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateBudget(editing.id, parsedAmount);
      } else {
        await createBudget({
          categoryId: Number(categoryId),
          amount: parsedAmount,
          month,
          year,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save budget.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <div>
        <label className={LABEL_CLASS} htmlFor="budget-category">
          Category
        </label>
        {editing ? (
          <input
            id="budget-category"
            className={`${FIELD_CLASS} opacity-70`}
            value={editing.category.name}
            readOnly
          />
        ) : (
          <select
            id="budget-category"
            className={FIELD_CLASS}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Select a category</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="budget-amount">
          Monthly limit (₹)
        </label>
        <input
          id="budget-amount"
          type="number"
          min="0"
          step="0.01"
          className={FIELD_CLASS}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Applies to {monthLabel(month)} {year}.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={BTN_SECONDARY}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className={BTN_PRIMARY} disabled={submitting}>
          {submitting ? "Saving…" : editing ? "Save amount" : "Create budget"}
        </button>
      </div>
    </form>
  );
}
