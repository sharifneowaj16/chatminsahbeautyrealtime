import 'server-only';
import prisma from '@/lib/prisma';
import { normalizeCorrelationId } from './correlation';
import { redactObservabilityData } from './redaction';

export type MetaTraceEvent = {
  source: 'ADMIN' | 'JOB' | 'CAPI_EVENT' | 'WEBHOOK' | 'CATALOG_BATCH' | 'CATALOG_DIAGNOSTIC' | 'INCIDENT';
  resourceId: string;
  status: string;
  occurredAt: Date;
  summary: string;
  details?: Record<string, unknown> | null;
};

type QueryDb = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

const db = prisma as unknown as QueryDb;

function date(value: unknown) {
  return value instanceof Date ? value : new Date(String(value));
}

function safeObject(value: unknown): Record<string, unknown> | null {
  const redacted = redactObservabilityData(value);
  return redacted && typeof redacted === 'object' && !Array.isArray(redacted)
    ? redacted as Record<string, unknown>
    : null;
}

export async function getMetaCorrelationTimeline(correlationIdInput: unknown) {
  const correlationId = normalizeCorrelationId(correlationIdInput);
  if (!correlationId) throw new Error('META_CORRELATION_ID_INVALID');

  const [adminRows, jobRows, eventRows, webhookRows, batchRows, diagnosticRows, incidentRows] = await Promise.all([
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "actionKey", "outcome", "resourceType", "resourceId", "afterData", "createdAt"
       FROM "MetaAdminAudit" WHERE "traceId" = $1 ORDER BY "createdAt" ASC LIMIT 100`, correlationId
    ),
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "jobName", "status", "sourceId", "progress", "createdAt", "updatedAt"
       FROM "MetaJobAudit" WHERE "correlationId" = $1 ORDER BY "createdAt" ASC LIMIT 100`, correlationId
    ),
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "eventName", "eventId", "status", "attempts", "createdAt", "updatedAt"
       FROM "MetaEventOutbox" WHERE "correlationId" = $1 ORDER BY "createdAt" ASC LIMIT 100`, correlationId
    ),
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "eventKey", "status", "leadgenId", "receivedAt", "updatedAt"
       FROM "MetaWebhookReceipt" WHERE "correlationId" = $1 ORDER BY "receivedAt" ASC LIMIT 100`, correlationId
    ),
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "handle", "catalogId", "status", "itemCount", "submittedAt", "checkedAt", "completedAt"
       FROM "MetaCatalogBatch" WHERE "correlationId" = $1 ORDER BY "submittedAt" ASC LIMIT 100`, correlationId
    ),
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "catalogId", "issueType", "severity", "status", "affectedItemCount", "lastSeenAt"
       FROM "MetaCatalogDiagnostic" WHERE "correlationId" = $1 ORDER BY "lastSeenAt" ASC LIMIT 100`, correlationId
    ),
    db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "id", "incidentType", "severity", "status", "summary", "occurrenceCount", "lastSeenAt"
       FROM "MetaIncident" WHERE "correlationId" = $1 ORDER BY "lastSeenAt" ASC LIMIT 100`, correlationId
    ),
  ]);

  const events: MetaTraceEvent[] = [
    ...adminRows.map((row) => ({
      source: 'ADMIN' as const,
      resourceId: String(row.id), status: String(row.outcome), occurredAt: date(row.createdAt),
      summary: `${String(row.actionKey)} on ${String(row.resourceType)}${row.resourceId ? ` ${String(row.resourceId)}` : ''}`,
      details: safeObject(row.afterData),
    })),
    ...jobRows.map((row) => ({
      source: 'JOB' as const,
      resourceId: String(row.id), status: String(row.status), occurredAt: date(row.updatedAt ?? row.createdAt),
      summary: `${String(row.jobName)}${row.sourceId ? ` for ${String(row.sourceId)}` : ''}`,
      details: safeObject({ progress: row.progress }),
    })),
    ...eventRows.map((row) => ({
      source: 'CAPI_EVENT' as const,
      resourceId: String(row.id), status: String(row.status), occurredAt: date(row.updatedAt ?? row.createdAt),
      summary: `${String(row.eventName)} event ${String(row.eventId)}`,
      details: safeObject({ attempts: row.attempts }),
    })),
    ...webhookRows.map((row) => ({
      source: 'WEBHOOK' as const,
      resourceId: String(row.id), status: String(row.status), occurredAt: date(row.updatedAt ?? row.receivedAt),
      summary: `Lead webhook ${row.leadgenId ? String(row.leadgenId) : String(row.eventKey)}`,
    })),
    ...batchRows.map((row) => ({
      source: 'CATALOG_BATCH' as const,
      resourceId: String(row.id), status: String(row.status), occurredAt: date(row.completedAt ?? row.checkedAt ?? row.submittedAt),
      summary: `Catalog batch ${String(row.handle)} for ${String(row.catalogId)}`,
      details: safeObject({ itemCount: row.itemCount }),
    })),
    ...diagnosticRows.map((row) => ({
      source: 'CATALOG_DIAGNOSTIC' as const,
      resourceId: String(row.id), status: String(row.status), occurredAt: date(row.lastSeenAt),
      summary: `${String(row.severity)} ${String(row.issueType)} in catalog ${String(row.catalogId)}`,
      details: safeObject({ affectedItemCount: row.affectedItemCount }),
    })),
    ...incidentRows.map((row) => ({
      source: 'INCIDENT' as const,
      resourceId: String(row.id), status: String(row.status), occurredAt: date(row.lastSeenAt),
      summary: String(row.summary),
      details: safeObject({ incidentType: row.incidentType, severity: row.severity, occurrenceCount: row.occurrenceCount }),
    })),
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  return { correlationId, eventCount: events.length, events };
}
