"use client";

import { CARD_CLASS } from "@/lib/ui";

/**
 * Centred card used by the login and register screens. Both auth routes render
 * outside the app shell, so this supplies its own background and branding.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span aria-hidden className="text-2xl">
            💰
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            PaisaTrack
          </span>
        </div>

        <div className={`${CARD_CLASS} p-6 sm:p-8`}>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {footer}
        </p>
      </div>
    </div>
  );
}
