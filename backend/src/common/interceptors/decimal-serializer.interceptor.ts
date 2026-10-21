import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Prisma returns money as `Decimal` objects. Serialising those straight to JSON
 * leaks the decimal.js internals, so every response is walked once and decimals
 * become plain numbers the client can safely do arithmetic with.
 */
@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((payload) => serializeDecimals(payload)));
  }
}

function isDecimal(value: unknown): value is Prisma.Decimal {
  return Prisma.Decimal.isDecimal(value);
}

export function serializeDecimals(value: unknown): unknown {
  if (isDecimal(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item));
  }

  // Dates, Buffers and streams must pass through untouched.
  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeDecimals(nested);
    }
    return result;
  }

  return value;
}
