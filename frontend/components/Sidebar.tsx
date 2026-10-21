"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "💳" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/recurring", label: "Recurring", icon: "🔁" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
] as const;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
        />
      )}

      <aside
        className={`sidebar-panel fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-900 text-slate-100 transition-[width,transform] duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sidebar-header flex items-center gap-2 px-5 py-5">
          <span aria-hidden className="text-2xl">
            💰
          </span>
          <div className="sidebar-brand min-w-0">
            <p className="text-lg font-bold leading-tight">PaisaTrack</p>
            <p className="text-xs text-slate-400">Personal Finance</p>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-toggle ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:inline-flex"
          >
            <span
              aria-hidden
              className="sidebar-chevron inline-block text-base leading-none transition-transform duration-200"
            >
              ‹
            </span>
          </button>
        </div>

        <nav
          className="sidebar-nav mt-2 flex-1 space-y-1 px-3"
          aria-label="Main navigation"
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
                onClick={onClose}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span aria-hidden className="text-base">
                  {item.icon}
                </span>
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="sidebar-footer px-5 py-4 text-xs text-slate-500">
          API: <span className="font-mono">/api</span>
        </p>
      </aside>
    </>
  );
}
