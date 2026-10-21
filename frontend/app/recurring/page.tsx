"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import Money from "@/components/Money";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/States";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  createRecurring,
  deleteRecurring,
  listAccounts,
  listCategories,
  listRecurring,
  runDueRecurring,
  updateRecurring,
  type Frequency,
  type PaymentMethod,
  type Recurring,
  type TransactionType,
} from "@/lib/api";
import { formatDate, todayInputValue } from "@/lib/format";
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

function frequencyText(recurring: Recurring): string {
  const base = FREQUENCY_LABELS[recurring.frequency] ?? recurring.frequency;
  return recurring.interval > 1
    ? `Every ${recurring.interval} ${base.toLowerCase()}`
    : base;
}

export default function RecurringPage() {
  const recurring = useApi(() => listRecurring(), []);
  const accounts = useApi(() => listAccounts(), []);
  const categories = useApi(() => listCategories(), []);

  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(item: Recurring) {
    setBusyId(item.id);
    setError(null);
    try {
      await updateRecurring(item.id, { active: !item.active });
      recurring.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update rule.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: Recurring) {
    setError(null);
    if (!window.confirm(`Delete recurring rule "${item.description}"?`)) return;
    setBusyId(item.id);
    try {
      await deleteRecurring(item.id);
      recurring.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete rule.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRunDue() {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const result = await runDueRecurring();
      setNotice(
        result.created === 0
          ? "No recurring payments were due."
          : `Created ${result.created} transaction${result.created === 1 ? "" : "s"}.`,
      );
      recurring.reload();
      accounts.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run due items.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Recurring"
        description="Automate repeating income and expenses."
        actions={
          <>
            <button
              type="button"
              onClick={handleRunDue}
              className={BTN_SECONDARY}
              disabled={running}
            >
              {running ? "Running…" : "▶ Run due now"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setFormOpen(true);
              }}
              className={BTN_PRIMARY}
            >
              + Add rule
            </button>
          </>
        }
      />

      {notice ? (
        <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      {recurring.loading ? (
        <LoadingBlock label="Loading recurring rules…" />
      ) : recurring.error ? (
        <ErrorBanner message={recurring.error} onRetry={recurring.reload} />
      ) : recurring.data && recurring.data.length > 0 ? (
        <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium">Next run</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recurring.data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {item.description}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span
                          className={`${PILL_CLASS} ${
                            item.type === "INCOME"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          }`}
                        >
                          {item.type === "INCOME" ? "Income" : "Expense"}
                        </span>
                        {item.category ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.category.name}
                          </span>
                        ) : null}
                        {!item.active ? (
                          <span
                            className={`${PILL_CLASS} bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400`}
                          >
                            Paused
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {frequencyText(item)}
                      <span className="block text-xs text-slate-400 dark:text-slate-500">
                        {PAYMENT_METHOD_LABELS[item.paymentMethod] ??
                          item.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(item.nextRun)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.account?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      <Money value={item.amount} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        disabled={busyId === item.id}
                        className={BTN_SECONDARY}
                      >
                        {item.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={busyId === item.id}
                        className={`${BTN_DANGER} ml-2`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No recurring rules"
          hint="Add a rule for rent, subscriptions or salary."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add recurring rule"
      >
        <RecurringForm
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          onSaved={() => {
            setFormOpen(false);
            recurring.reload();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </>
  );
}

function RecurringForm({
  accounts,
  categories,
  onSaved,
  onCancel,
}: {
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; type: TransactionType }[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(
    accounts[0] ? String(accounts[0].id) : "",
  );
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");
  const [interval, setIntervalValue] = useState("1");
  const [nextRun, setNextRun] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeCategories = categories.filter(
    (category) => category.type === type,
  );

  async function submit(event: React.FormEvent) {
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
    if (!nextRun) {
      setError("Please choose the next run date.");
      return;
    }
    setSubmitting(true);
    try {
      await createRecurring({
        description: description.trim(),
        type,
        amount: parsedAmount,
        accountId: Number(accountId),
        categoryId: categoryId ? Number(categoryId) : null,
        paymentMethod,
        frequency,
        interval: Number(interval) || 1,
        nextRun: new Date(`${nextRun}T00:00:00`).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rule.");
      setSubmitting(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Create an account first, then add recurring rules against it.
      </p>
    );
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
        <label className={LABEL_CLASS} htmlFor="rec-description">
          Description
        </label>
        <input
          id="rec-description"
          className={FIELD_CLASS}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. House rent"
          required
        />
      </div>

      <fieldset>
        <legend className={LABEL_CLASS}>Type</legend>
        <div className="flex gap-2">
          {(["INCOME", "EXPENSE"] as TransactionType[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              onClick={() => {
                setType(option);
                setCategoryId("");
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                type === option
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {option === "INCOME" ? "Income" : "Expense"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-amount">
            Amount (₹)
          </label>
          <input
            id="rec-amount"
            type="number"
            min="0"
            step="0.01"
            className={FIELD_CLASS}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-nextrun">
            Next run
          </label>
          <input
            id="rec-nextrun"
            type="date"
            className={FIELD_CLASS}
            value={nextRun}
            onChange={(event) => setNextRun(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-account">
            Account
          </label>
          <select
            id="rec-account"
            className={FIELD_CLASS}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-category">
            Category
          </label>
          <select
            id="rec-category"
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-frequency">
            Frequency
          </label>
          <select
            id="rec-frequency"
            className={FIELD_CLASS}
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
          >
            {FREQUENCIES.map((option) => (
              <option key={option} value={option}>
                {FREQUENCY_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-interval">
            Every
          </label>
          <input
            id="rec-interval"
            type="number"
            min="1"
            className={FIELD_CLASS}
            value={interval}
            onChange={(event) => setIntervalValue(event.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="rec-method">
            Payment
          </label>
          <select
            id="rec-method"
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
          {submitting ? "Saving…" : "Create rule"}
        </button>
      </div>
    </form>
  );
}
