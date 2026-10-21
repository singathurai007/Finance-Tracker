"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "💳" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar-panel hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-100 transition-[width] duration-200 ease-out md:sticky md:top-0 md:z-auto md:flex md:h-screen">
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
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
