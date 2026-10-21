export interface Period {
  month: number;
  year: number;
}

/** First instant of the month, in UTC — transaction dates are stored as UTC. */
export function periodStart({ month, year }: Period): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

/** First instant of the following month (exclusive upper bound). */
export function periodEnd({ month, year }: Period): Date {
  return new Date(Date.UTC(year, month, 1));
}

export function daysInMonth({ month, year }: Period): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Falls back to the current month/year when the caller omits them. */
export function resolvePeriod(input: { month?: number; year?: number }): Period {
  const now = new Date();
  return {
    month: input.month ?? now.getMonth() + 1,
    year: input.year ?? now.getFullYear(),
  };
}

export function monthLabel({ month, year }: Period): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
