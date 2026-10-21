"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner, LoadingBlock } from "@/components/States";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import {
  API_ORIGIN,
  AUDIT_LEVELS,
  getHealth,
  listAuditLogs,
  type AuditLevel,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { BTN_SECONDARY, CARD_CLASS, FIELD_CLASS, LABEL_CLASS, PILL_CLASS } from "@/lib/ui";
import { useApi } from "@/lib/useApi";

const LEVEL_STYLE: Record<AuditLevel, string> = {
  INFO: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  WARN: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  ERROR: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const PAGE_SIZE = 20;

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Appearance, setup information and diagnostic logs."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <AppearanceSection />
        <SetupSection />
      </div>
      <div className="mt-6">
        <AuditLogSection />
      </div>
    </>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; hint: string; icon: string }[] = [
    { value: "light", label: "Light", hint: "Bright, low-contrast surfaces", icon: "☀️" },
    { value: "dark", label: "Dark", hint: "Easy on the eyes at night", icon: "🌙" },
  ];

  return (
    <section className={`${CARD_CLASS} p-5`}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Appearance
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your preference is saved in this browser and defaults to your system
        setting.
      </p>

      <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Theme</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              theme === option.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => setTheme(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                <span aria-hidden className="mr-1">
                  {option.icon}
                </span>
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

function SetupSection() {
  const health = useApi(() => getHealth(), []);

  return (
    <section className={`${CARD_CLASS} p-5`}>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        About &amp; setup
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        PaisaTrack is a personal finance manager. This frontend talks to the
        PaisaTrack REST API.
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">API base (proxied)</dt>
          <dd className="font-mono text-slate-800 dark:text-slate-100">/api</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500 dark:text-slate-400">Proxied to</dt>
          <dd className="truncate font-mono text-slate-800 dark:text-slate-100">
            {API_ORIGIN}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Backend health</span>
          {health.loading ? (
            <span className="text-slate-400">checking…</span>
          ) : health.error ? (
            <span className="font-medium text-rose-600 dark:text-rose-400">
              unreachable
            </span>
          ) : (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {health.data?.status ?? "ok"}
            </span>
          )}
        </div>
        {health.data ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {health.data.service} · {formatDateTime(health.data.timestamp)}
          </p>
        ) : null}
        {health.error ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Start the backend on {API_ORIGIN} to enable live data.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AuditLogSection() {
  const [level, setLevel] = useState<AuditLevel | "">("");
  const [page, setPage] = useState(1);

  const logs = useApi(
    () => listAuditLogs({ level, page, pageSize: PAGE_SIZE }),
    [level, page],
  );

  const totalPages = logs.data?.totalPages ?? 1;

  return (
    <section className={`${CARD_CLASS} p-5`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Error &amp; audit logs
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Recent activity recorded by the API.
          </p>
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="audit-level">
            Level
          </label>
          <select
            id="audit-level"
            className={FIELD_CLASS}
            value={level}
            onChange={(event) => {
              setLevel(event.target.value as AuditLevel | "");
              setPage(1);
            }}
          >
            <option value="">All levels</option>
            {AUDIT_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {logs.loading ? (
          <LoadingBlock label="Loading logs…" />
        ) : logs.error ? (
          <ErrorBanner message={logs.error} onRetry={logs.reload} />
        ) : logs.data && logs.data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-3 py-2 font-medium">Level</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Entity</th>
                    <th className="px-3 py-2 font-medium">Message</th>
                    <th className="px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.data.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="px-3 py-2">
                        <span className={`${PILL_CLASS} ${LEVEL_STYLE[log.level]}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                        {log.action}
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {log.entity}
                        {log.entityId ? ` #${log.entityId}` : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {log.message ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500 dark:text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Page {logs.data.page} of {totalPages} · {logs.data.total} entries
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No logs found" hint="Try a different level filter." />
        )}
      </div>
    </section>
  );
}
