import { Prisma } from '../generated/prisma/client.js';

/**
 * Prisma reports known database errors through numeric codes. Mapping them to
 * HTTP errors is what turns a raw constraint violation into a message the user
 * can act on.
 */
export function hasPrismaCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** P2002: unique constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return hasPrismaCode(error, 'P2002');
}

/** P2003: foreign key constraint violation. */
export function isForeignKeyViolation(error: unknown): boolean {
  return hasPrismaCode(error, 'P2003');
}

/** P2025: the record required by the query was not found. */
export function isRecordNotFound(error: unknown): boolean {
  return hasPrismaCode(error, 'P2025');
}
