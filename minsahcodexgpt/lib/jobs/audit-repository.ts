import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import type { MetaJobPayload, MetaJobStatus, MetaQueueName, MetaJobName } from './job-types';

export type MetaJobAuditRecord = {
  id: string;
  queueName: MetaQueueName;
  jobName: MetaJobName;
  externalJobId: string | null;
  idempotencyKey: string;
  correlationId: string | null;
  status: MetaJobStatus;
  attempts: number;
  maxAttempts: number;
  progress: number | null;
  sourceId: string | null;
  payload: MetaJobPayload;
  lastError: Record<string, unknown> | null;
  rateLimitState: Record<string, unknown> | null;
  replayOfId: string | null;
  replayCount: number;
  requestedBy: string | null;
  nextRunAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MetaJobDb = Pick<Prisma.TransactionClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

function dbOrDefault(db?: MetaJobDb) {
  return db ?? (prisma as unknown as MetaJobDb);
}

function json(value: unknown) {
  return value == null ? null : JSON.stringify(value);
}

function parseJson<T>(value: T | string | null): T | null {
  if (value == null) return null;
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value;
}

function hydrate(row: Record<string, unknown>): MetaJobAuditRecord {
  return {
    id: String(row.id),
    queueName: String(row.queueName) as MetaQueueName,
    jobName: String(row.jobName) as MetaJobName,
    externalJobId: row.externalJobId == null ? null : String(row.externalJobId),
    idempotencyKey: String(row.idempotencyKey),
    correlationId: row.correlationId == null ? null : String(row.correlationId),
    status: String(row.status) as MetaJobStatus,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.maxAttempts ?? 5),
    progress: row.progress == null ? null : Number(row.progress),
    sourceId: row.sourceId == null ? null : String(row.sourceId),
    payload: parseJson(row.payload as MetaJobPayload | string | null) as MetaJobPayload,
    lastError: parseJson(row.lastError as Record<string, unknown> | string | null),
    rateLimitState: parseJson(row.rateLimitState as Record<string, unknown> | string | null),
    replayOfId: row.replayOfId == null ? null : String(row.replayOfId),
    replayCount: Number(row.replayCount ?? 0),
    requestedBy: row.requestedBy == null ? null : String(row.requestedBy),
    nextRunAt: row.nextRunAt == null ? null : new Date(row.nextRunAt as string | number | Date),
    startedAt: row.startedAt == null ? null : new Date(row.startedAt as string | number | Date),
    completedAt: row.completedAt == null ? null : new Date(row.completedAt as string | number | Date),
    lastHeartbeatAt: row.lastHeartbeatAt == null ? null : new Date(row.lastHeartbeatAt as string | number | Date),
    createdAt: new Date(row.createdAt as string | number | Date),
    updatedAt: new Date(row.updatedAt as string | number | Date),
  };
}

export async function reserveMetaJobAudit(input: {
  queueName: MetaQueueName;
  jobName: MetaJobName;
  idempotencyKey: string;
  payload: MetaJobPayload;
  sourceId?: string;
  maxAttempts?: number;
  requestedBy?: string;
  replayOfId?: string;
  db?: MetaJobDb;
}) {
  const executor = dbOrDefault(input.db);
  const id = crypto.randomUUID();
  const inserted = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "MetaJobAudit" (
       "id", "queueName", "jobName", "idempotencyKey", "correlationId", "status", "attempts", "maxAttempts",
       "sourceId", "payload", "requestedBy", "replayOfId", "createdAt", "updatedAt"
     ) VALUES (
       $1, $2, $3, $4, $5, 'QUEUED'::"MetaJobStatus", 0, $6,
       $7, $8::jsonb, $9, $10, NOW(), NOW()
     )
     ON CONFLICT ("idempotencyKey") DO NOTHING
     RETURNING *`,
    id,
    input.queueName,
    input.jobName,
    input.idempotencyKey,
    input.payload.correlationId ?? null,
    input.maxAttempts ?? 5,
    input.sourceId ?? null,
    json(input.payload),
    input.requestedBy ?? null,
    input.replayOfId ?? null
  );
  if (inserted[0]) return { record: hydrate(inserted[0]), created: true };

  const existing = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaJobAudit" WHERE "idempotencyKey" = $1 LIMIT 1`,
    input.idempotencyKey
  );
  if (!existing[0]) throw new Error('META_JOB_AUDIT_CONFLICT_LOOKUP_FAILED');
  return { record: hydrate(existing[0]), created: false };
}

export async function attachMetaJobExternalId(input: {
  auditId: string;
  externalJobId: string;
  db?: MetaJobDb;
}) {
  const rows = await dbOrDefault(input.db).$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaJobAudit"
     SET "externalJobId" = $2, "status" = 'QUEUED'::"MetaJobStatus", "lastError" = NULL, "updatedAt" = NOW()
     WHERE "id" = $1 RETURNING *`,
    input.auditId,
    input.externalJobId
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function updateMetaJobAudit(input: {
  auditId: string;
  status: MetaJobStatus;
  attempts?: number;
  progress?: number | null;
  error?: Record<string, unknown> | null;
  rateLimitState?: Record<string, unknown> | null;
  nextRunAt?: Date | null;
  heartbeat?: boolean;
  db?: MetaJobDb;
}) {
  const executor = dbOrDefault(input.db);
  const startedAt = input.status === 'RUNNING';
  const terminal = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER'].includes(input.status);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaJobAudit"
     SET "status" = $2::"MetaJobStatus",
         "attempts" = COALESCE($3, "attempts"),
         "progress" = COALESCE($4, "progress"),
         "lastError" = $5::jsonb,
         "rateLimitState" = COALESCE($6::jsonb, "rateLimitState"),
         "nextRunAt" = $7,
         "startedAt" = CASE WHEN $8 THEN COALESCE("startedAt", NOW()) ELSE "startedAt" END,
         "completedAt" = CASE WHEN $9 THEN NOW() ELSE NULL END,
         "lastHeartbeatAt" = CASE WHEN $10 THEN NOW() ELSE "lastHeartbeatAt" END,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING *`,
    input.auditId,
    input.status,
    input.attempts ?? null,
    input.progress ?? null,
    json(input.error ?? null),
    json(input.rateLimitState ?? null),
    input.nextRunAt ?? null,
    startedAt,
    terminal,
    input.heartbeat ?? false
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function incrementMetaJobReplayCount(auditId: string, db?: MetaJobDb) {
  const rows = await dbOrDefault(db).$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaJobAudit" source
     SET "replayCount" = (
       SELECT COUNT(*)::int
       FROM "MetaJobAudit" replay
       WHERE replay."replayOfId" = source."id"
         AND replay."jobName" <> 'social-event-replay'
     ), "updatedAt" = NOW()
     WHERE source."id" = $1
     RETURNING source.*`,
    auditId
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function getMetaJobAuditById(id: string, db?: MetaJobDb) {
  const rows = await dbOrDefault(db).$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaJobAudit" WHERE "id" = $1 LIMIT 1`,
    id
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function listMetaJobAudits(input: {
  status?: MetaJobStatus;
  queueName?: MetaQueueName;
  limit?: number;
  db?: MetaJobDb;
} = {}) {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const rows = await dbOrDefault(input.db).$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaJobAudit"
     WHERE ($1::text IS NULL OR "status"::text = $1)
       AND ($2::text IS NULL OR "queueName" = $2)
     ORDER BY "createdAt" DESC
     LIMIT $3`,
    input.status ?? null,
    input.queueName ?? null,
    limit
  );
  return rows.map(hydrate);
}
