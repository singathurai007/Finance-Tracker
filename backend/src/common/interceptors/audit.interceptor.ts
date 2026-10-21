import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, mergeMap } from 'rxjs';
import { AuditService } from '../../audit/audit.service.js';

const MUTATING_METHODS: Record<string, string> = {
  POST: 'CREATE',
  PATCH: 'UPDATE',
  PUT: 'REPLACE',
  DELETE: 'DELETE',
};

interface AuditedRequest {
  method: string;
  originalUrl: string;
}

/**
 * Records one audit entry per successful write request (POST/PATCH/PUT/DELETE)
 * so the Settings screen can show who changed what and when.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const action = MUTATING_METHODS[request.method];
    if (!action) {
      return next.handle();
    }

    const [path] = request.originalUrl.split('?');
    const segments = path.split('/').filter((segment) => segment.length > 0 && segment !== 'api');
    const entity = segments.at(0) ?? 'unknown';
    const routeId = segments.at(1);

    return next.handle().pipe(
      mergeMap(async (body) => {
        const responseId =
          typeof body === 'object' && body !== null && 'id' in body
            ? String((body as { id: unknown }).id)
            : routeId;

        await this.audit.record({
          action,
          entity,
          entityId: responseId ?? null,
          message: `${request.method} ${path}`,
        });

        return body;
      }),
    );
  }
}
