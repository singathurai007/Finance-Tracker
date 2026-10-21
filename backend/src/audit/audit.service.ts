import { Injectable, Logger } from '@nestjs/common';
import { LogLevel, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  message?: string | null;
  level?: LogLevel;
  metadata?: Prisma.InputJsonValue;
}

export interface AuditLogPage {
  data: Awaited<ReturnType<PrismaService['auditLog']['findMany']>>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Single place that records audit and error events: writes to the `AuditLog`
 * table for the Settings screen and mirrors the entry to the Nest logger so it
 * also lands in the server output.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    const level = entry.level ?? LogLevel.INFO;
    const label = `${entry.action} ${entry.entity}${entry.entityId ? `#${entry.entityId}` : ''}`;
    const detail = entry.message ? `${label} — ${entry.message}` : label;

    if (level === LogLevel.ERROR) {
      this.logger.error(detail);
    } else if (level === LogLevel.WARN) {
      this.logger.warn(detail);
    } else {
      this.logger.log(detail);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          level,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          message: entry.message ?? null,
          metadata: entry.metadata,
        },
      });
    } catch (error) {
      // Auditing must never fail the request that produced the event.
      this.logger.warn(`Could not persist audit log: ${(error as Error).message}`);
    }
  }

  async list(params: { level?: LogLevel; page: number; pageSize: number }): Promise<AuditLogPage> {
    const where: Prisma.AuditLogWhereInput = params.level ? { level: params.level } : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    };
  }
}
