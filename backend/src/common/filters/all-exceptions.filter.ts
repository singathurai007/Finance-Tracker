import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from '../../audit/audit.service.js';
import { LogLevel } from '../../generated/prisma/client.js';

interface FailedRequest {
  method: string;
  originalUrl: string;
}

/**
 * Turns any thrown value into a consistent JSON error body and records it in the
 * audit log. Server errors (5xx) are stored as ERROR, client errors as WARN.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly audit: AuditService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const context = host.switchToHttp();
    const request = context.getRequest<FailedRequest>();
    const response = context.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttpException ? exception.getResponse() : null;

    let error = 'Internal Server Error';
    let message: string | string[] = 'Unexpected error while processing the request';

    if (typeof payload === 'string') {
      error = payload;
      message = payload;
    } else if (payload !== null && typeof payload === 'object') {
      const body = payload as { error?: string; message?: string | string[] };
      error = body.error ?? error;
      message = body.message ?? message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const detail = Array.isArray(message) ? message.join('; ') : message;

    await this.audit.record({
      level: status >= HttpStatus.INTERNAL_SERVER_ERROR ? LogLevel.ERROR : LogLevel.WARN,
      action: 'HTTP_ERROR',
      entity: 'request',
      message: `${request.method} ${request.originalUrl} -> ${status} ${detail}`,
      metadata: { status, method: request.method, path: request.originalUrl },
    });

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
