"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { NAV_ITEMS } from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import {
  getAuthServerSnapshot,
  getAuthSnapshot,
  initialsOf,
  subscribeAuth,
} from "@/lib/auth";
import {
  getSidebarServerSnapshot,
  getSidebarSnapshot,
  setSidebarState,
  subscribeSidebar,
} from "@/lib/sidebar";
import { useIsMounted } from "@/lib/useIsMounted";

/** Routes rendered outside the shell, without a session. */
const AUTH_ROUTES = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  const sidebarState = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );
  const mounted = useIsMounted();

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Signed out -> login; signed in but sitting on login/register -> dashboard.
  useEffect(() => {
    if (isAuthRoute && session) {
      router.replace("/");
    } else if (!isAuthRoute && !session) {
      router.replace("/login");
    }
  }, [isAuthRoute, session, router]);

  const toggleCollapsed = useCallback(() => {
    setSidebarState(
      getSidebarSnapshot() === "collapsed" ? "expanded" : "collapsed",
    );
  }, []);

  if (isAuthRoute) {
    return session ? <Splash /> : <>{children}</>;
  }

  if (mounted && !session) {
    return <Splash />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={sidebarState === "collapsed"}
        onToggleCollapse={toggleCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
       <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
  {/* Mobile brand: left corner */}
  <Link
    href="/"
    className="flex min-w-0 flex-col text-left md:hidden"
  >
    <span className="flex items-center gap-1.5 text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
      <span aria-hidden>💰</span>
      PaisaTrack
    </span>
    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
      Personal Finance
    </span>
  </Link>

  {/* Theme and profile: right corner */}
  <div className="ml-auto flex items-center gap-2">
    <ThemeToggle />

    {session ? (
      <Link
        href="/settings"
        aria-label={`Signed in as ${session.user.name}. Open your profile settings`}
        title={`${session.user.name} — View profile`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
      >
        <span className="grid h-full w-full place-items-center overflow-hidden rounded-full">
          {session.user.avatar ? (
            <img
              src={session.user.avatar}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            initialsOf(session.user.name)
          )}
        </span>
      </Link>
    ) : null}
  </div>
</header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6 lg:px-8">
          {children}
        </main>

        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <span aria-hidden className="text-base leading-none">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Shown for the instant before the session is known and the redirect lands. */
function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <span
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400"
      >
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-600 dark:border-t-blue-500"
        />
        Loading…
      </span>
    </div>
  );
}
