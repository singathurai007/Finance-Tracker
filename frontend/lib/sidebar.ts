"use client";

export type SidebarState = "expanded" | "collapsed";

const STORAGE_KEY = "paisatrack-sidebar";

let listeners: Array<() => void> = [];
let cached: SidebarState | null = null;

function compute(): SidebarState {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "collapsed"
      ? "collapsed"
      : "expanded";
  } catch {
    return "expanded";
  }
}

export function subscribeSidebar(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((existing) => existing !== listener);
  };
}

export function getSidebarSnapshot(): SidebarState {
  if (cached === null) cached = compute();
  return cached;
}

export function getSidebarServerSnapshot(): SidebarState {
  return "expanded";
}

export function setSidebarState(next: SidebarState): void {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage access errors
  }
  document.documentElement.dataset.sidebar = next;
  for (const listener of listeners) listener();
}
