"use client";

/**
 * Session store backed by `localStorage`.
 *
 * Mirrors `lib/theme.ts`: a module-level cache keeps the snapshot reference
 * stable so `useSyncExternalStore` does not loop, and writes notify every
 * subscriber so the shell re-renders immediately after login or logout.
 */

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

const STORAGE_KEY = "paisatrack-session";

let listeners: Array<() => void> = [];
let read: Session | null | undefined;
let snapshot: Session | null = null;

function load(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    if (!parsed || typeof parsed.token !== "string" || !parsed.user) return null;
    return { token: parsed.token, user: parsed.user };
  } catch {
    return null;
  }
}

export function subscribeAuth(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((existing) => existing !== listener);
  };
}

export function getAuthSnapshot(): Session | null {
  if (read === undefined) {
    read = load();
    snapshot = read;
  }
  return snapshot;
}

export function getAuthServerSnapshot(): Session | null {
  return null;
}

/** Bearer token for API calls, or `null` when signed out. */
export function getToken(): string | null {
  return getAuthSnapshot()?.token ?? null;
}

export function setSession(next: Session | null): void {
  read = next;
  snapshot = next;
  try {
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage access errors
  }
  for (const listener of listeners) listener();
}

export function clearSession(): void {
  setSession(null);
}

/** Keeps the cached user in step after a profile edit. */
export function updateSessionUser(user: AuthUser): void {
  const current = getAuthSnapshot();
  if (current) setSession({ token: current.token, user });
}

/** "Sathish Kumar" -> "SK"; a single word keeps its first two letters. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
