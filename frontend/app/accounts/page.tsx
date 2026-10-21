"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import Money from "@/components/Money";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/States";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  ApiError,
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  type Account,
  type AccountType,
} from "@/lib/api";
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_CLASS,
  FIELD_CLASS,
  LABEL_CLASS,
  PILL_CLASS,
} from "@/lib/ui";
import { useApi } from "@/lib/useApi";

interface FormState {
  name: string;
  type: AccountType;
  openingBalance: string;
  currency: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  type: "BANK",
  openingBalance: "0",
  currency: "INR",
};

export default function AccountsPage() {
  const accounts = useApi(() => listAccounts(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(form: FormState) {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      openingBalance: Number(form.openingBalance) || 0,
      currency: form.currency.trim() || "INR",
    };
    if (editing) {
      await updateAccount(editing.id, payload);
    } else {
      await createAccount(payload);
    }
    setFormOpen(false);
    setEditing(null);
    accounts.reload();
  }

  async function handleDelete(account: Account) {
    setError(null);
    if (
      !window.confirm(
        `Delete account "${account.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteAccount(account.id);
      accounts.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not delete account.");
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Cash, bank, wallet and card balances."
        actions={
          <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
            + Add account
          </button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      {accounts.loading ? (
        <LoadingBlock label="Loading accounts…" />
      ) : accounts.error ? (
        <ErrorBanner message={accounts.error} onRetry={accounts.reload} />
      ) : accounts.data && accounts.data.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.data.map((account) => (
            <article key={account.id} className={`${CARD_CLASS} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {account.name}
                  </h2>
                  <span
                    className={`${PILL_CLASS} mt-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}
                  >
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                  </span>
                </div>
                {account.archived ? (
                  <span
                    className={`${PILL_CLASS} bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`}
                  >
                    Archived
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Current balance
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                <Money value={account.balance} />
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Income
                  </dt>
                  <dd className="font-medium text-emerald-600 dark:text-emerald-400">
                    <Money value={account.income} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Expenses
                  </dt>
                  <dd className="font-medium text-rose-600 dark:text-rose-400">
                    <Money value={account.expenses} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Opening
                  </dt>
                  <dd className="text-slate-700 dark:text-slate-200">
                    <Money value={account.openingBalance} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">
                    Transactions
                  </dt>
                  <dd className="text-slate-700 dark:text-slate-200">
                    {account.transactionCount}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(account)}
                  className={`${BTN_SECONDARY} flex-1`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(account)}
                  className={BTN_DANGER}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No accounts yet"
          hint="Add your first account to start tracking."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit account" : "Add account"}
      >
        <AccountForm
          key={editing?.id ?? "new"}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </>
  );
}

function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Account | null;
  onSubmit: (form: FormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          type: initial.type,
          openingBalance: String(initial.openingBalance),
          currency: initial.currency || "INR",
        }
      : EMPTY_FORM,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Please enter an account name.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save account.");
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
        <label className={LABEL_CLASS} htmlFor="account-name">
          Account name
        </label>
        <input
          id="account-name"
          className={FIELD_CLASS}
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="e.g. HDFC Savings"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="account-type">
            Type
          </label>
          <select
            id="account-type"
            className={FIELD_CLASS}
            value={form.type}
            onChange={(event) =>
              setForm({ ...form, type: event.target.value as AccountType })
            }
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ACCOUNT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="account-currency">
            Currency
          </label>
          <input
            id="account-currency"
            className={FIELD_CLASS}
            value={form.currency}
            onChange={(event) =>
              setForm({ ...form, currency: event.target.value.toUpperCase() })
            }
            maxLength={3}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="account-opening">
          Opening balance (₹)
        </label>
        <input
          id="account-opening"
          type="number"
          step="0.01"
          className={FIELD_CLASS}
          value={form.openingBalance}
          onChange={(event) =>
            setForm({ ...form, openingBalance: event.target.value })
          }
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {initial
            ? "Opening balance edits do not change recorded transactions."
            : "Starting balance before any transactions."}
        </p>
      </div>

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
          {submitting ? "Saving…" : initial ? "Save changes" : "Create account"}
        </button>
      </div>
    </form>
  );
}
