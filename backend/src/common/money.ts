import { Prisma } from '../generated/prisma/client.js';

/** Rounds to paise so money never carries floating point noise in responses. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Prisma returns money as `Decimal`; this flattens it to a plain number. */
export function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return value ? value.toNumber() : 0;
}
