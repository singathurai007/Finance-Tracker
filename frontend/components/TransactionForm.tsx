"use client";

import { useMemo, useState } from "react";
import {
  ACCOUNT_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPES,
  type Account,
  type Category,
  type PaymentMethod,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from "@/lib/api";
import { todayInputValue, toDateInputValue } from "@/lib/format";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS, LABEL_CLASS } from "@/lib/ui";

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  initial?: Transaction | null;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onCancel: () => void;
}

export default function TransactionForm({
  accounts,
  categories,
  initial,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(
    initial?.type ?? "EXPENSE",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : "",
  );
  const [date, setDate] = useState(
    initial ? toDateInputValue(initial.date) : todayInputValue(),
  );
  const [accountId, setAccountId] = useState(
    initial ? String(initial.accountId) : accounts[0] ? String(accounts[0].id) : "",
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId != null ? String(initial.categoryId) : "",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "CASH",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategoryId((prev) => {
      if (!prev) return "";
      const stillValid = categories.some(
        (category) => category.id === Number(prev) && category.type === next,
      );
      return stillValid ? prev : "";
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      return;
    }
    if (!accountId) {
      setError("Please select an account.");
      return;
    }
    if (!date) {
      setError("Please choose a date.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        description: description.trim(),
        amount: parsedAmount,
        date: new Date(`${date}T00:00:00`).toISOString(),
        accountId: Number(accountId),
        categoryId: categoryId ? Number(categoryId) : null,
        paymentMethod,
        notes: notes.trim() ? notes.trim() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save transaction.");
      setSubmitting(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        You need at least one account before adding transactions. Create one on
        the Accounts page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <fieldset>
        <legend className={LABEL_CLASS}>Type</legend>
        <div className="flex gap-2">
          {TRANSACTION_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleTypeChange(option)}
              aria-pressed={type === option}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                type === option
                  ? option === "INCOME"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {option === "INCOME" ? "Income" : "Expense"}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={LABEL_CLASS} htmlFor="tx-description">
          Description
        </label>
        <input
          id="tx-description"
          className={FIELD_CLASS}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. Grocery shopping"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="tx-amount">
            Amount (₹)
          </label>
          <input
            id="tx-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={FIELD_CLASS}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="tx-date">
            Date
          </label>
          <input
            id="tx-date"
            type="date"
            className={FIELD_CLASS}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="tx-account">
            Account
          </label>
          <select
            id="tx-account"
            className={FIELD_CLASS}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({ACCOUNT_TYPE_LABELS[account.type]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="tx-category">
            Category
          </label>
          <select
            id="tx-category"
            className={FIELD_CLASS}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Uncategorised</option>
            {typeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="tx-method">
          Payment method
        </label>
        <select
          id="tx-method"
          className={FIELD_CLASS}
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(event.target.value as PaymentMethod)
          }
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="tx-notes">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="tx-notes"
          className={FIELD_CLASS}
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
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
          {submitting ? "Saving…" : initial ? "Save changes" : "Add transaction"}
        </button>
      </div>
    </form>
  );
}
