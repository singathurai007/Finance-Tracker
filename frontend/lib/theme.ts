"use client";

export type Theme = "light" | "dark";

const STORAGE_KEY = "paisatrack-theme";

let listeners: Array<() => void> = [];
let cached: Theme | null = null;

function compute(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function subscribeTheme(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((existing) => existing !== listener);
  };
}

export function getThemeSnapshot(): Theme {
  if (cached === null) cached = compute();
  return cached;
}

export function getThemeServerSnapshot(): Theme {
  return "light";
}

export function setTheme(next: Theme): void {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage access errors
  }
  document.documentElement.classList.toggle("dark", next === "dark");
  for (const listener of listeners) listener();
}
