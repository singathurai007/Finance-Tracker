"use client";

import { useIsMounted } from "@/lib/useIsMounted";
import { useState } from "react";
import type { Period } from "@/components/MonthYearPicker";

/**
 * Tracks the selected month/year. Starts as `null` during SSR and the first
 * hydration render so the current date is only read on the client.
 */
export function usePeriod(): [Period | null, (period: Period) => void] {
  const mounted = useIsMounted();
  const [selected, setSelected] = useState<Period | null>(null);

  let period = selected;
  if (period === null && mounted) {
    const now = new Date();
    period = { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  return [period, setSelected];
}
