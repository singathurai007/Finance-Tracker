"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Money from "@/components/Money";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/States";
import TransactionForm from "@/components/TransactionForm";
import {
  PAYMENT_METHOD_LABELS,
  createTransaction,
  deleteTransaction,
  downloadTransactionsCsv,
  listAccounts,
  listCategories,
  listTransactions,
  updateTransaction,
  type Transaction,
  type TransactionFilters,
  type TransactionInput,
} from "@/lib/api";
import { MONTH_NAMES, formatDateNumeric } from "@/lib/format";
import {
  BTN_DANGER,
  BTN_DANGER_TEXT,
  BTN_GHOST,
  BTN_OUTLINE,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_CLASS,
  FIELD_CLASS,
  LABEL_CLASS,
} from "@/lib/ui";
import { useApi } from "@/lib/useApi";

const DEFAULT_FILTERS: TransactionFilters = {
  type: "",
  categoryId: "",
  accountId: "",
  search: "",
  month: "",
  page: 1,
  pageSize: 10,
};

const MONTH_FILTER_OPTIONS = lastMonths(60);

/** "All months" options for the month filter, newest first. */
function lastMonths(count: number): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const month = date.getMonth() + 1;
    return {
      value: `${date.getFullYear()}-${String(month).padStart(2, "0")}`,
      label: `${MONTH_NAMES[month - 1]} ${date.getFullYear()}`,
    };
  });
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const accounts = useApi(() => listAccounts(), []);
  const categories = useApi(() => listCategories(), []);
  const transactions = useApi(() => listTransactions(filters), [filters]);

  // Debounce free-text search into the filters.
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput
          ? prev
          : { ...prev, search: searchInput, page: 1 },
      );
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  function openCreate() {
    setEditing(null);
    setActionError(null);
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setActionError(null);
    setFormOpen(true);
  }

  async function handleSubmit(input: TransactionInput) {
    if (editing) {
      await updateTransaction(editing.id, input);
    } else {
      await createTransaction(input);
    }
    setFormOpen(false);
    setEditing(null);
    transactions.reload();
    accounts.reload();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setActionError(null);
    setDeleteBusy(true);
    try {
      await deleteTransaction(deleting.id);
      setDeleting(null);
      if (transactions.data && transactions.data.data.length === 1 && filters.page && filters.page > 1) {
        setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }));
      } else {
        transactions.reload();
      }
      accounts.reload();
    } catch (error) {
      setDeleting(null);
      setActionError(
        error instanceof Error ? error.message : "Could not delete transaction.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleExport() {
    setActionError(null);
    setExporting(true);
    try {
      await downloadTransactionsCsv(filters);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not export transactions.",
      );
    } finally {
      setExporting(false);
    }
  }

  const result = transactions.data;
  const totalPages = result?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Search, filter and manage every income and expense."
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className={BTN_SECONDARY}
            >
              {exporting ? "Exporting…" : "⬇ Export CSV"}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className={`${BTN_PRIMARY} md:px-3 md:py-1.5`}
            >
              + Add
            </button>
          </>
        }
      />

      {(actionError || transactions.error) && (
        <div className="mb-4">
          <ErrorBanner
            message={actionError ?? transactions.error ?? ""}
            onRetry={actionError ? undefined : transactions.reload}
          />
        </div>
      )}

      <section className={`${CARD_CLASS} mb-5 p-4`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-search">
              Search
            </label>
            <input
              id="filter-search"
              className={FIELD_CLASS}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="search products…"
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-type">
              Type
            </label>
            <select
              id="filter-type"
              className={FIELD_CLASS}
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  type: event.target.value as TransactionFilters["type"],
                  page: 1,
                }))
              }
            >
              <option value="">All types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-category">
              Category
            </label>
            <select
              id="filter-category"
              className={FIELD_CLASS}
              value={filters.categoryId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  categoryId: event.target.value ? Number(event.target.value) : "",
                  page: 1,
                }))
              }
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-account">
              Account
            </label>
            <select
              id="filter-account"
              className={FIELD_CLASS}
              value={filters.accountId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  accountId: event.target.value ? Number(event.target.value) : "",
                  page: 1,
                }))
              }
            >
              <option value="">All accounts</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-month">
              Month
            </label>
            <select
              id="filter-month"
              className={FIELD_CLASS}
              value={filters.month}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  month: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">All months</option>
              {MONTH_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() => {
              setSearchInput("");
              setFilters(DEFAULT_FILTERS);
            }}
          >
            Clear filters
          </button>
        </div>
      </section>

      {result ? (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className={`${CARD_CLASS} px-3 py-3 sm:px-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Income</p>
            <p className="mt-0.5 truncate text-base font-semibold text-emerald-600 sm:text-lg dark:text-emerald-400">
              <Money value={result.totals.income} />
            </p>
          </div>
          <div className={`${CARD_CLASS} px-3 py-3 sm:px-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Expenses</p>
            <p className="mt-0.5 truncate text-base font-semibold text-rose-600 sm:text-lg dark:text-rose-400">
              <Money value={result.totals.expenses} />
            </p>
          </div>
          <div className={`${CARD_CLASS} px-3 py-3 sm:px-4`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Net</p>
            <p className="mt-0.5 truncate text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">
              <Money value={result.totals.net} />
            </p>
          </div>
        </div>
      ) : null}

      {transactions.loading ? (
        <LoadingBlock label="Loading transactions…" />
      ) : result && result.data.length > 0 ? (
        <section className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <ul className="divide-y divide-slate-100 border-t border-slate-200 sm:hidden dark:divide-slate-800/60 dark:border-slate-800">
              {result.data.map((tx) => (
                <li key={tx.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {tx.description}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="shrink-0">
                          {formatDateNumeric(tx.date)}
                        </span>
                        <span aria-hidden>·</span>
                        {tx.category ? (
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: tx.category.color }}
                          />
                        ) : null}
                        <span className="truncate">
                          {tx.category?.name ?? "Uncategorised"}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {tx.account?.name ?? "—"}
                      </p>
                      {tx.notes ? (
                        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                          {tx.notes}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "−"}
                      <Money value={tx.amount} />
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(tx)}
                      className={BTN_OUTLINE}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(tx)}
                      className={BTN_DANGER}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <table className="hidden w-full min-w-[720px] text-left text-sm sm:table">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateNumeric(tx.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {tx.description}
                      {tx.notes ? (
                        <span className="block text-xs font-normal text-slate-400">
                          {tx.notes}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-2">
                        {tx.category ? (
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: tx.category.color }}
                          />
                        ) : null}
                        {tx.category?.name ?? "Uncategorised"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {tx.account?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "−"}
                      <Money value={tx.amount} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
  <span
    className="text-sm font-semibold text-slate-600 dark:text-slate-300"
    aria-label={`Page ${currentPage} of ${totalPages}`}
  >
    {currentPage}/{result.total}
  </span>

  <div className="flex items-center gap-2">
    <button
      type="button"
      aria-label="Previous page"
      title="Previous page"
      disabled={currentPage <= 1}
      onClick={() =>
        setFilters((prev) => ({
          ...prev,
          page: Math.max(1, (prev.page ?? 1) - 1),
        }))
      }
      className={`${BTN_SECONDARY} !px-3`}
    >
      ‹
    </button>

    <button
      type="button"
      aria-label="Next page"
      title="Next page"
      disabled={currentPage >= totalPages}
      onClick={() =>
        setFilters((prev) => ({
          ...prev,
          page: (prev.page ?? 1) + 1,
        }))
      }
      className={`${BTN_SECONDARY} !px-3`}
    >
      ›
    </button>
  </div>
</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages} · {result.total} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={BTN_SECONDARY}
                disabled={currentPage <= 1}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: Math.max(1, (prev.page ?? 1) - 1),
                  }))
                }
              >
                Previous
              </button>
              <button
                type="button"
                className={BTN_SECONDARY}
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: (prev.page ?? 1) + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          title="No transactions found"
          hint="Try changing your filters or add a new transaction."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit transaction" : "Add transaction"}
      >
        <TransactionForm
          key={editing?.id ?? "new"}
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete transaction"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Delete{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {deleting?.description}
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
