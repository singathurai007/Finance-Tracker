"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Money from "@/components/Money";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/States";
import TransactionForm from "@/components/TransactionForm";
import {
  ACCOUNT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  createTransaction,
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  transactionsExportHref,
  updateTransaction,
  type Transaction,
  type TransactionFilters,
  type TransactionInput,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  BTN_GHOST,
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
  from: "",
  to: "",
  page: 1,
  pageSize: 10,
  sortBy: "date",
  sortOrder: "desc",
};

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
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

  async function handleDelete(tx: Transaction) {
    setActionError(null);
    const confirmed = window.confirm(
      `Delete "${tx.description}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteTransaction(tx.id);
      if (transactions.data && transactions.data.data.length === 1 && filters.page && filters.page > 1) {
        setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }));
      } else {
        transactions.reload();
      }
      accounts.reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete transaction.",
      );
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
            <a
              href={transactionsExportHref(filters)}
              className={BTN_SECONDARY}
              download
            >
              ⬇ Export CSV
            </a>
            <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
              + Add transaction
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-search">
              Search
            </label>
            <input
              id="filter-search"
              className={FIELD_CLASS}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Description…"
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
            <label className={LABEL_CLASS} htmlFor="filter-from">
              From
            </label>
            <input
              id="filter-from"
              type="date"
              className={FIELD_CLASS}
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  from: event.target.value,
                  page: 1,
                }))
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-to">
              To
            </label>
            <input
              id="filter-to"
              type="date"
              className={FIELD_CLASS}
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value, page: 1 }))
              }
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-sort">
              Sort by
            </label>
            <select
              id="filter-sort"
              className={FIELD_CLASS}
              value={filters.sortBy}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: event.target.value as "date" | "amount",
                  page: 1,
                }))
              }
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="filter-order">
              Order
            </label>
            <select
              id="filter-order"
              className={FIELD_CLASS}
              value={filters.sortOrder}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sortOrder: event.target.value as "asc" | "desc",
                  page: 1,
                }))
              }
            >
              <option value="desc">Newest / largest first</option>
              <option value="asc">Oldest / smallest first</option>
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
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className={`${CARD_CLASS} px-4 py-3`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Income</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              <Money value={result.totals.income} />
            </p>
          </div>
          <div className={`${CARD_CLASS} px-4 py-3`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Expenses</p>
            <p className="text-lg font-semibold text-rose-600 dark:text-rose-400">
              <Money value={result.totals.expenses} />
            </p>
          </div>
          <div className={`${CARD_CLASS} px-4 py-3`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Net</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
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
                      {formatDate(tx.date)}
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
                      {tx.account
                        ? `${tx.account.name} (${ACCOUNT_TYPE_LABELS[tx.account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? tx.account.type})`
                        : "—"}
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
                      <button
                        type="button"
                        onClick={() => openEdit(tx)}
                        className={BTN_GHOST}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tx)}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
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
    </>
  );
}
