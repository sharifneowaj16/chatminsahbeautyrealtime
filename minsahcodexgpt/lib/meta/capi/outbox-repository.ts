import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { ensureCorrelationId } from '@/lib/observability/correlation';
import type {
  CreateMetaEventOutboxInput,
  MetaEventOutboxRecord,
  MetaEventOutboxStatus,
} from './types';

export type MetaOutboxDb = Pick<
  Prisma.TransactionClient,
  '$queryRawUnsafe' | '$executeRawUnsafe'
>;

function dbOrDefault(db?: MetaOutboxDb) {
  return (db ?? (prisma as unknown as MetaOutboxDb));
}

function json(value: unknown) {
  return value == null ? null : JSON.stringify(value);
}

function parseJson<T>(value: T | string | null): T | null {
  if (value == null) return null;
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value;
}

function hydrate(row: Record<string, unknown>): MetaEventOutboxRecord {
  return {
    id: String(row.id),
    correlationId: String(row.correlationId),
    provider: String(row.provider),
    eventName: String(row.eventName),
    eventId: String(row.eventId),
    sourceType: String(row.sourceType),
    sourceId: row.sourceId == null ? null : String(row.sourceId),
    orderId: row.orderId == null ? null : String(row.orderId),
    actionSource: String(row.actionSource),
    eventSourceUrl: row.eventSourceUrl == null ? null : String(row.eventSourceUrl),
    eventTime: new Date(row.eventTime as string | number | Date),
    payload: parseJson(row.payload as MetaEventOutboxRecord['payload'] | string | null) as MetaEventOutboxRecord['payload'],
    safePayload: parseJson(row.safePayload as Record<string, unknown> | string | null),
    policyVersion: String(row.policyVersion),
    policyReason: String(row.policyReason),
    consentState: String(row.consentState),
    consentVersion: row.consentVersion == null ? null : String(row.consentVersion),
    allowAdvancedMatching: Boolean(row.allowAdvancedMatching),
    retentionUntil: new Date(row.retentionUntil as string | number | Date),
    status: String(row.status) as MetaEventOutboxStatus,
    attempts: Number(row.attempts ?? 0),
    nextAttemptAt: row.nextAttemptAt == null ? null : new Date(row.nextAttemptAt as string | number | Date),
    leaseToken: row.leaseToken == null ? null : String(row.leaseToken),
    leaseExpiresAt: row.leaseExpiresAt == null ? null : new Date(row.leaseExpiresAt as string | number | Date),
    dispatchedAt: row.dispatchedAt == null ? null : new Date(row.dispatchedAt as string | number | Date),
    processingAt: row.processingAt == null ? null : new Date(row.processingAt as string | number | Date),
    sentAt: row.sentAt == null ? null : new Date(row.sentAt as string | number | Date),
    response: parseJson(row.response as Record<string, unknown> | string | null),
    lastError: parseJson(row.lastError as Record<string, unknown> | string | null),
    suppressReason: row.suppressReason == null ? null : String(row.suppressReason),
    createdAt: new Date(row.createdAt as string | number | Date),
    updatedAt: new Date(row.updatedAt as string | number | Date),
  };
}

async function appendStatusEvent(
  db: MetaOutboxDb,
  input: {
    outboxId: string;
    status: MetaEventOutboxStatus;
    attempt?: number;
    note?: string | null;
    safeDetails?: Record<string, unknown> | null;
  }
) {
  await db.$executeRawUnsafe(
    `INSERT INTO "MetaEventOutboxStatusEvent"
      ("id", "outboxId", "status", "attempt", "note", "safeDetails", "createdAt")
     VALUES ($1, $2, $3::"MetaEventOutboxStatus", $4, $5, $6::jsonb, NOW())`,
    crypto.randomUUID(),
    input.outboxId,
    input.status,
    input.attempt ?? 0,
    input.note ?? null,
    json(input.safeDetails)
  );
}

export async function createMetaEventOutbox(
  input: CreateMetaEventOutboxInput,
  db?: MetaOutboxDb
) {
  const executor = dbOrDefault(db);
  const id = crypto.randomUUID();
  const correlationId = ensureCorrelationId(input.correlationId, 'meta-event');
  const inserted = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "MetaEventOutbox" (
       "id", "correlationId", "provider", "eventName", "eventId", "sourceType", "sourceId", "orderId",
       "actionSource", "eventSourceUrl", "eventTime", "payload", "safePayload",
       "policyVersion", "policyReason", "consentState", "consentVersion",
       "allowAdvancedMatching", "retentionUntil", "status", "attempts", "createdAt", "updatedAt"
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11, $12::jsonb, $13::jsonb,
       $14, $15, $16::"TrackingConsentState", $17, $18, $19,
       'PENDING'::"MetaEventOutboxStatus", 0, NOW(), NOW()
     )
     ON CONFLICT ("provider", "eventName", "eventId") DO NOTHING
     RETURNING *`,
    id,
    correlationId,
    input.provider ?? 'META',
    input.eventName,
    input.eventId,
    input.sourceType,
    input.sourceId ?? null,
    input.orderId ?? null,
    input.actionSource,
    input.eventSourceUrl,
    input.eventTime,
    json(input.payload),
    json(input.safePayload),
    input.policyDecision.policyVersion,
    input.policyDecision.reason,
    input.policyDecision.consentState,
    input.policyDecision.consentVersion,
    input.policyDecision.allowAdvancedMatching,
    new Date(input.policyDecision.retentionUntil)
  );

  if (inserted[0]) {
    const record = hydrate(inserted[0]);
    await appendStatusEvent(executor, {
      outboxId: record.id,
      status: 'PENDING',
      note: 'Transactional outbox event persisted.',
      safeDetails: record.safePayload,
    });
    return { record, created: true };
  }

  const existing = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaEventOutbox"
     WHERE "provider" = $1 AND "eventName" = $2 AND "eventId" = $3
     LIMIT 1`,
    input.provider ?? 'META',
    input.eventName,
    input.eventId
  );
  if (!existing[0]) throw new Error('META_OUTBOX_CONFLICT_LOOKUP_FAILED');
  return { record: hydrate(existing[0]), created: false };
}

export async function getMetaEventOutboxById(id: string, db?: MetaOutboxDb) {
  const rows = await dbOrDefault(db).$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaEventOutbox" WHERE "id" = $1 LIMIT 1`,
    id
  );
  return rows[0] ? hydrate(rows[0]) : null;
}

export async function leaseDueMetaEventOutbox(params: {
  limit?: number;
  leaseMs?: number;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(params.db);
  const leaseToken = crypto.randomUUID();
  const limit = Math.max(1, Math.min(params.limit ?? 25, 100));
  const leaseMs = Math.max(5_000, params.leaseMs ?? 60_000);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `WITH candidates AS (
       SELECT "id"
       FROM "MetaEventOutbox"
       WHERE "status" IN ('PENDING', 'RETRY_SCHEDULED', 'DISPATCHED')
         AND COALESCE("nextAttemptAt", "createdAt") <= NOW()
         AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
       ORDER BY COALESCE("nextAttemptAt", "createdAt") ASC, "createdAt" ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE "MetaEventOutbox" AS outbox
     SET "status" = 'DISPATCHED'::"MetaEventOutboxStatus",
         "leaseToken" = $2,
         "leaseExpiresAt" = NOW() + ($3 * INTERVAL '1 millisecond'),
         "dispatchedAt" = COALESCE("dispatchedAt", NOW()),
         "updatedAt" = NOW()
     FROM candidates
     WHERE outbox."id" = candidates."id"
     RETURNING outbox.*`,
    limit,
    leaseToken,
    leaseMs
  );
  const records = rows.map(hydrate);
  for (const record of records) {
    await appendStatusEvent(executor, {
      outboxId: record.id,
      status: 'DISPATCHED',
      attempt: record.attempts,
      note: 'Dispatcher lease acquired.',
      safeDetails: { leaseToken, leaseMs },
    });
  }
  return { leaseToken, records };
}

export async function markMetaOutboxProcessing(input: {
  outboxId: string;
  leaseToken?: string | null;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(input.db);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaEventOutbox"
     SET "status" = 'PROCESSING'::"MetaEventOutboxStatus",
         "attempts" = "attempts" + 1,
         "processingAt" = NOW(),
         "updatedAt" = NOW()
     WHERE "id" = $1
       AND "status" IN ('DISPATCHED', 'RETRY_SCHEDULED', 'PENDING', 'PROCESSING')
       AND ($2::text IS NULL OR "leaseToken" = $2)
     RETURNING *`,
    input.outboxId,
    input.leaseToken ?? null
  );
  if (!rows[0]) return null;
  const record = hydrate(rows[0]);
  await appendStatusEvent(executor, {
    outboxId: record.id,
    status: 'PROCESSING',
    attempt: record.attempts,
    note: 'Sender started delivery.',
  });
  return record;
}

export async function markMetaOutboxSent(input: {
  outboxId: string;
  response?: Record<string, unknown> | null;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(input.db);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaEventOutbox"
     SET "status" = 'SENT'::"MetaEventOutboxStatus",
         "sentAt" = NOW(),
         "response" = $2::jsonb,
         "lastError" = NULL,
         "nextAttemptAt" = NULL,
         "leaseToken" = NULL,
         "leaseExpiresAt" = NULL,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING *`,
    input.outboxId,
    json(input.response)
  );
  if (!rows[0]) return null;
  const record = hydrate(rows[0]);
  await appendStatusEvent(executor, {
    outboxId: record.id,
    status: 'SENT',
    attempt: record.attempts,
    note: 'Meta accepted the event.',
    safeDetails: input.response ?? null,
  });
  return record;
}

export async function scheduleMetaOutboxRetry(input: {
  outboxId: string;
  nextAttemptAt: Date;
  error: Record<string, unknown>;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(input.db);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaEventOutbox"
     SET "status" = 'RETRY_SCHEDULED'::"MetaEventOutboxStatus",
         "nextAttemptAt" = $2,
         "lastError" = $3::jsonb,
         "leaseToken" = NULL,
         "leaseExpiresAt" = NULL,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING *`,
    input.outboxId,
    input.nextAttemptAt,
    json(input.error)
  );
  if (!rows[0]) return null;
  const record = hydrate(rows[0]);
  await appendStatusEvent(executor, {
    outboxId: record.id,
    status: 'RETRY_SCHEDULED',
    attempt: record.attempts,
    note: 'Transient delivery failure scheduled for retry.',
    safeDetails: { nextAttemptAt: input.nextAttemptAt.toISOString(), ...input.error },
  });
  return record;
}

export async function markMetaOutboxPermanentFailure(input: {
  outboxId: string;
  error: Record<string, unknown>;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(input.db);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaEventOutbox"
     SET "status" = 'FAILED_PERMANENT'::"MetaEventOutboxStatus",
         "lastError" = $2::jsonb,
         "nextAttemptAt" = NULL,
         "leaseToken" = NULL,
         "leaseExpiresAt" = NULL,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING *`,
    input.outboxId,
    json(input.error)
  );
  if (!rows[0]) return null;
  const record = hydrate(rows[0]);
  await appendStatusEvent(executor, {
    outboxId: record.id,
    status: 'FAILED_PERMANENT',
    attempt: record.attempts,
    note: 'Permanent delivery failure.',
    safeDetails: input.error,
  });
  return record;
}

export async function releaseMetaOutboxDispatch(input: {
  outboxId: string;
  error: Record<string, unknown>;
  nextAttemptAt?: Date;
  db?: MetaOutboxDb;
}) {
  return scheduleMetaOutboxRetry({
    outboxId: input.outboxId,
    error: input.error,
    nextAttemptAt: input.nextAttemptAt ?? new Date(Date.now() + 60_000),
    db: input.db,
  });
}


export async function markMetaOutboxSuppressed(input: {
  outboxId: string;
  reason: string;
  safeDetails?: Record<string, unknown> | null;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(input.db);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaEventOutbox"
     SET "status"='SUPPRESSED'::"MetaEventOutboxStatus",
         "suppressReason"=$2, "leaseToken"=NULL, "leaseExpiresAt"=NULL,
         "updatedAt"=NOW() WHERE "id"=$1 RETURNING *`,
    input.outboxId, input.reason
  );
  if (!rows[0]) return null;
  const record = hydrate(rows[0]);
  await appendStatusEvent(executor, {
    outboxId: record.id, status: 'SUPPRESSED', attempt: record.attempts,
    note: input.reason, safeDetails: input.safeDetails ?? null,
  });
  return record;
}

export async function requeueMetaOutboxById(input: {
  outboxId: string;
  reason: string;
  db?: MetaOutboxDb;
}) {
  const executor = dbOrDefault(input.db);
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaEventOutbox"
     SET "status" = 'PENDING'::"MetaEventOutboxStatus",
         "nextAttemptAt" = NULL,
         "leaseToken" = NULL,
         "leaseExpiresAt" = NULL,
         "processingAt" = NULL,
         "updatedAt" = NOW()
     WHERE "id" = $1 AND "status" <> 'SENT'::"MetaEventOutboxStatus"
     RETURNING *`,
    input.outboxId
  );
  if (!rows[0]) return null;
  const record = hydrate(rows[0]);
  await appendStatusEvent(executor, {
    outboxId: record.id,
    status: 'PENDING',
    attempt: record.attempts,
    note: input.reason,
  });
  return record;
}

export async function listMetaEventOutbox(input: {
  status?: MetaEventOutboxStatus;
  eventName?: string;
  limit?: number;
  db?: MetaOutboxDb;
} = {}) {
  const executor = dbOrDefault(input.db);
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const rows = await executor.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaEventOutbox"
     WHERE ($1::text IS NULL OR "status"::text = $1)
       AND ($2::text IS NULL OR "eventName" = $2)
     ORDER BY "createdAt" DESC
     LIMIT $3`,
    input.status ?? null,
    input.eventName?.trim() || null,
    limit
  );
  return rows.map(hydrate);
}
