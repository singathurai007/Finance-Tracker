"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Something went wrong.";
}

/**
 * Runs an async fetcher on mount and whenever `deps` change.
 *
 * The fetcher is intentionally not part of the dependency list: callers pass
 * the values that should trigger a refetch via `deps`. State is only updated
 * after the request settles, which keeps renders predictable.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await fetcher();
        if (!active) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(toMessage(err));
      } finally {
        if (active) setDone(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => {
    setError(null);
    setDone(false);
    setNonce((value) => value + 1);
  }, []);

  return { data, loading: !done, error, reload };
}
