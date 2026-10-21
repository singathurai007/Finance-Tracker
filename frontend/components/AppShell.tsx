"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import {
  getSidebarServerSnapshot,
  getSidebarSnapshot,
  setSidebarState,
  subscribeSidebar,
} from "@/lib/sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarState = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  const toggleCollapsed = useCallback(() => {
    setSidebarState(
      getSidebarSnapshot() === "collapsed" ? "expanded" : "collapsed",
    );
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarState === "collapsed"}
        onToggleCollapse={toggleCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 md:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span aria-hidden>☰</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold text-slate-900 md:hidden dark:text-slate-100"
          >
            <span aria-hidden>💰</span>
            PaisaTrack
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
