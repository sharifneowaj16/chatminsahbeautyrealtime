import 'server-only';

import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { assertMetaVersionedPayload, digestMetaVersionedPayload } from './payload';
import { assertMetaOperationTransition, isMetaOperationTerminal } from './transitions';
import { assertMetaOperationIdempotencyMatch, type MetaOperationStore, type MetaOperationTransactionContext } from './store';
import { normalizeMetaOperationExpiry } from '../reliability/deadline';
import { META_OPERATION_PRIORITIES, type MetaOperationPriority } from '../reliability/types';
import type {
  CreateMetaOperationInput,
  MetaClaimedOutboxBatch,
  MetaCommittedOperation,
  MetaOperationEventRecord,
  MetaOperationExecutionClaim,
  MetaOperationRecord,
  MetaOperationSafeError,
  MetaOperationStatus,
  MetaOutboxMessageRecord,
} from './types';

export interface MetaOperationSqlExecutor {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

export interface MetaOperationPrismaClient extends MetaOperationSqlExecutor {
  $transaction<T>(callback: (tx: MetaOperationSqlExecutor) => Promise<T>): Promise<T>;
}

const json = (value: unknown): string | null => value == null ? null : JSON.stringify(value);
const parseJson = <T>(value: unknown): T | undefined => {
  if (value == null) return undefined;
  return typeof value === 'string' ? JSON.parse(value) as T : value as T;
};
const iso = (value: unknown): string | undefined => value == null ? undefined : new Date(value as string | number | Date).toISOString();

function normalizePriority(value: MetaOperationPriority | undefined): MetaOperationPriority {
  const priority = value ?? 'P2';
  if (!META_OPERATION_PRIORITIES.includes(priority)) throw new TypeError('META_OPERATION_PRIORITY_INVALID');
  return priority;
}

function cleanIdentifier(value: string, code: string, max: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new TypeError(code);
  return normalized;
}

function hydrateOperation(row: Record<string, unknown>): MetaOperationRecord {
  return Object.freeze({
    id: String(row.id),
    environment: String(row.environment) as MetaOperationRecord['environment'],
    connectionKey: String(row.connectionKey),
    idempotencyKey: String(row.idempotencyKey),
    capability: String(row.capability),
    operationType: String(row.operationType),
    ...(row.credentialRole == null ? {} : { credentialRole: String(row.credentialRole) as MetaOperationRecord['credentialRole'] }),
    correlationId: String(row.correlationId),
    actorType: String(row.actorType) as MetaOperationRecord['actorType'],
    ...(row.actorReference == null ? {} : { actorReference: String(row.actorReference) }),
    ...(row.assetType == null ? {} : { assetType: String(row.assetType) as MetaOperationRecord['assetType'] }),
    ...(row.assetId == null ? {} : { assetId: String(row.assetId) }),
    payload: Object.freeze({
      type: String(row.payloadType),
      schemaVersion: Number(row.payloadSchemaVersion),
      data: parseJson(row.payload) ?? null,
    }),
    payloadDigest: String(row.payloadDigest),
    status: String(row.status) as MetaOperationStatus,
    priority: String(row.priority ?? 'P2') as MetaOperationPriority,
    attempts: Number(row.attempts ?? 0),
    expiresAt: iso(row.expiresAt) ?? new Date(0).toISOString(),
    ...(iso(row.nextAttemptAt) ? { nextAttemptAt: iso(row.nextAttemptAt) } : {}),
    ...(row.replayOfOperationId == null ? {} : { replayOfOperationId: String(row.replayOfOperationId) }),
    ...(row.result == null ? {} : { result: Object.freeze(parseJson<Record<string, unknown>>(row.result) ?? {}) }),
    ...(row.lastError == null ? {} : { lastError: Object.freeze(parseJson<Record<string, unknown>>(row.lastError) ?? {}) }),
    ...(row.executionLeaseToken == null ? {} : { executionLeaseToken: String(row.executionLeaseToken) }),
    ...(iso(row.executionLeaseExpiresAt) ? { executionLeaseExpiresAt: iso(row.executionLeaseExpiresAt) } : {}),
    ...(iso(row.startedAt) ? { startedAt: iso(row.startedAt) } : {}),
    ...(iso(row.completedAt) ? { completedAt: iso(row.completedAt) } : {}),
    createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
  });
}

function hydrateOutbox(row: Record<string, unknown>): MetaOutboxMessageRecord {
  return Object.freeze({
    id: String(row.id),
    operationId: String(row.operationId),
    topic: String(row.topic),
    partitionKey: String(row.partitionKey),
    payload: Object.freeze({
      type: String(row.payloadType),
      schemaVersion: Number(row.payloadSchemaVersion),
      data: parseJson(row.payload) ?? null,
    }),
    payloadDigest: String(row.payloadDigest),
    state: String(row.state) as MetaOutboxMessageRecord['state'],
    priority: String(row.priority ?? 'P2') as MetaOperationPriority,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.maxAttempts ?? 10),
    availableAt: iso(row.availableAt) ?? new Date(0).toISOString(),
    ...(row.leaseToken == null ? {} : { leaseToken: String(row.leaseToken) }),
    ...(iso(row.leaseExpiresAt) ? { leaseExpiresAt: iso(row.leaseExpiresAt) } : {}),
    ...(iso(row.publishedAt) ? { publishedAt: iso(row.publishedAt) } : {}),
    ...(row.lastError == null ? {} : { lastError: Object.freeze(parseJson<Record<string, unknown>>(row.lastError) ?? {}) }),
    ...(row.quarantineReason == null ? {} : { quarantineReason: String(row.quarantineReason) }),
    createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
  });
}

function hydrateEvent(row: Record<string, unknown>): MetaOperationEventRecord {
  return Object.freeze({
    id: String(row.id),
    operationId: String(row.operationId),
    sequence: Number(row.sequence),
    eventType: String(row.eventType) as MetaOperationEventRecord['eventType'],
    ...(row.fromStatus == null ? {} : { fromStatus: String(row.fromStatus) as MetaOperationStatus }),
    ...(row.toStatus == null ? {} : { toStatus: String(row.toStatus) as MetaOperationStatus }),
    attempt: Number(row.attempt ?? 0),
    ...(row.safeDetails == null ? {} : { safeDetails: Object.freeze(parseJson<Record<string, unknown>>(row.safeDetails) ?? {}) }),
    createdAt: iso(row.createdAt) ?? new Date(0).toISOString(),
  });
}

async function appendEvent(tx: MetaOperationSqlExecutor, input: {
  readonly operationId: string;
  readonly eventType: MetaOperationEventRecord['eventType'];
  readonly fromStatus?: MetaOperationStatus;
  readonly toStatus?: MetaOperationStatus;
  readonly attempt?: number;
  readonly safeDetails?: Readonly<Record<string, unknown>>;
}): Promise<MetaOperationEventRecord> {
  const sequenceRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaOperation"
     SET "nextEventSequence" = "nextEventSequence" + 1, "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING "nextEventSequence"`,
    input.operationId,
  );
  if (!sequenceRows[0]) throw new Error('META_OPERATION_EVENT_PARENT_MISSING');
  const sequence = Number(sequenceRows[0].nextEventSequence);
  const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "MetaOperationEvent"
      ("id", "operationId", "sequence", "eventType", "fromStatus", "toStatus", "attempt", "safeDetails", "createdAt")
     VALUES ($1, $2, $3, $4::"MetaOperationEventType", $5::"MetaOperationStatus", $6::"MetaOperationStatus", $7, $8::jsonb, NOW())
     RETURNING *`,
    randomUUID(),
    input.operationId,
    sequence,
    input.eventType,
    input.fromStatus ?? null,
    input.toStatus ?? null,
    input.attempt ?? 0,
    json(input.safeDetails),
  );
  if (!rows[0]) throw new Error('META_OPERATION_EVENT_INSERT_FAILED');
  return hydrateEvent(rows[0]);
}

async function lockOperation(tx: MetaOperationSqlExecutor, operationId: string): Promise<MetaOperationRecord | null> {
  const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "MetaOperation" WHERE "id" = $1 FOR UPDATE`,
    operationId,
  );
  return rows[0] ? hydrateOperation(rows[0]) : null;
}

async function transitionOperation(tx: MetaOperationSqlExecutor, input: {
  readonly operationId: string;
  readonly toStatus: MetaOperationStatus;
  readonly eventType: MetaOperationEventRecord['eventType'];
  readonly safeDetails?: Readonly<Record<string, unknown>>;
  readonly result?: Readonly<Record<string, unknown>> | null;
  readonly error?: MetaOperationSafeError | null;
  readonly clearExecutionLease?: boolean;
  readonly complete?: boolean;
}): Promise<MetaOperationRecord> {
  const current = await lockOperation(tx, input.operationId);
  if (!current) throw new Error('META_OPERATION_NOT_FOUND');
  assertMetaOperationTransition(current.status, input.toStatus);
  const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "MetaOperation"
     SET "status" = $2::"MetaOperationStatus",
         "result" = CASE WHEN $3::jsonb IS NULL THEN "result" ELSE $3::jsonb END,
         "lastError" = $4::jsonb,
         "executionLeaseToken" = CASE WHEN $5 THEN NULL ELSE "executionLeaseToken" END,
         "executionLeaseExpiresAt" = CASE WHEN $5 THEN NULL ELSE "executionLeaseExpiresAt" END,
         "completedAt" = CASE WHEN $6 THEN NOW() ELSE "completedAt" END,
         "nextAttemptAt" = CASE WHEN $2::"MetaOperationStatus" IN ('DISPATCHING', 'QUEUED', 'RUNNING', 'SUCCEEDED') THEN NULL ELSE "nextAttemptAt" END,
         "updatedAt" = NOW()
     WHERE "id" = $1
     RETURNING *`,
    input.operationId,
    input.toStatus,
    json(input.result),
    json(input.error),
    input.clearExecutionLease ?? false,
    input.complete ?? false,
  );
  if (!rows[0]) throw new Error('META_OPERATION_TRANSITION_UPDATE_FAILED');
  const updated = hydrateOperation(rows[0]);
  await appendEvent(tx, {
    operationId: input.operationId,
    eventType: input.eventType,
    fromStatus: current.status,
    toStatus: input.toStatus,
    attempt: updated.attempts,
    safeDetails: input.safeDetails,
  });
  return updated;
}

export class PrismaMetaOperationStore implements MetaOperationStore {
  private readonly client: MetaOperationPrismaClient;

  constructor(client: MetaOperationPrismaClient = prisma as unknown as MetaOperationPrismaClient) {
    this.client = client;
  }

  async commitWithOperation<TBusinessResult>(
    input: CreateMetaOperationInput,
    businessMutation?: (tx: MetaOperationTransactionContext) => Promise<TBusinessResult>,
  ): Promise<MetaCommittedOperation<TBusinessResult>> {
    assertMetaVersionedPayload(input.payload);
    const connectionKey = cleanIdentifier(input.connectionKey, 'META_OPERATION_CONNECTION_KEY_INVALID', 80);
    const idempotencyKey = cleanIdentifier(input.idempotencyKey, 'META_OPERATION_IDEMPOTENCY_KEY_INVALID', 200);
    const capability = cleanIdentifier(input.capability, 'META_OPERATION_CAPABILITY_INVALID', 120);
    const operationType = cleanIdentifier(input.operationType, 'META_OPERATION_TYPE_INVALID', 160);
    const assetId = input.assetId ? cleanIdentifier(input.assetId, 'META_OPERATION_ASSET_ID_INVALID', 255) : undefined;
    const replayOfOperationId = input.replayOfOperationId ? cleanIdentifier(input.replayOfOperationId, 'META_OPERATION_REPLAY_LINK_INVALID', 255) : undefined;
    const payloadDigest = digestMetaVersionedPayload(input.payload);
    const priority = normalizePriority(input.priority);
    const expiresAt = normalizeMetaOperationExpiry(input.expiresAt);
    const normalizedInput = {
      ...input,
      priority,
      connectionKey,
      idempotencyKey,
      capability,
      operationType,
      ...(input.expiresAt !== undefined ? { expiresAt } : {}),
      ...(assetId ? { assetId } : {}),
      ...(replayOfOperationId ? { replayOfOperationId } : {}),
    };

    return this.client.$transaction(async (tx) => {
      const operationId = randomUUID();
      const inserted = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `INSERT INTO "MetaOperation" (
          "id", "environment", "connectionKey", "capability", "operationType", "idempotencyKey",
          "correlationId", "actorType", "actorReference", "assetType", "assetId", "credentialRole",
          "payloadType", "payloadSchemaVersion", "payload", "payloadDigest", "status", "priority", "attempts",
          "replayOfOperationId", "nextEventSequence", "expiresAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2::"MetaPlatformEnvironment", $3, $4, $5, $6,
          $7, $8, $9, $10::"MetaAssetType", $11, $12::"MetaCredentialRole",
          $13, $14, $15::jsonb, $16, 'ACCEPTED'::"MetaOperationStatus", $17::"MetaOperationPriority", 0,
          $18, 0, $19, NOW(), NOW()
        )
        ON CONFLICT ("environment", "connectionKey", "idempotencyKey") DO NOTHING
        RETURNING *`,
        operationId,
        input.environment,
        connectionKey,
        capability,
        operationType,
        idempotencyKey,
        input.invocation.correlationId,
        input.invocation.actor.type,
        input.invocation.actor.reference ?? null,
        input.assetType ?? null,
        assetId ?? null,
        input.credentialRole ?? null,
        input.payload.type,
        input.payload.schemaVersion,
        json(input.payload.data),
        payloadDigest,
        priority,
        replayOfOperationId ?? null,
        expiresAt,
      );

      if (!inserted[0]) {
        const existingRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM "MetaOperation"
           WHERE "environment" = $1::"MetaPlatformEnvironment" AND "connectionKey" = $2 AND "idempotencyKey" = $3
           LIMIT 1`,
          input.environment,
          connectionKey,
          idempotencyKey,
        );
        if (!existingRows[0]) throw new Error('META_OPERATION_IDEMPOTENCY_LOOKUP_FAILED');
        const existing = hydrateOperation(existingRows[0]);
        assertMetaOperationIdempotencyMatch(existing, normalizedInput, payloadDigest);
        const messageRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM "MetaOutboxMessage" WHERE "operationId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
          existing.id,
        );
        if (!messageRows[0]) throw new Error('META_OPERATION_OUTBOX_MISSING');
        await appendEvent(tx, {
          operationId: existing.id,
          eventType: 'DUPLICATE_IGNORED',
          fromStatus: existing.status,
          toStatus: existing.status,
          attempt: existing.attempts,
          safeDetails: { idempotencyKey },
        });
        return { created: false, operation: existing, outbox: hydrateOutbox(messageRows[0]) };
      }

      const operation = hydrateOperation(inserted[0]);
      await appendEvent(tx, {
        operationId: operation.id,
        eventType: 'OPERATION_ACCEPTED',
        toStatus: 'ACCEPTED',
        safeDetails: { payloadDigest },
      });

      let businessResult: TBusinessResult | undefined;
      if (businessMutation) {
        businessResult = await businessMutation({ implementation: 'PRISMA', raw: tx });
      }

      const messageRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `INSERT INTO "MetaOutboxMessage" (
          "id", "operationId", "topic", "partitionKey", "payloadType", "payloadSchemaVersion",
          "payload", "payloadDigest", "state", "priority", "attempts", "maxAttempts", "availableAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8,
          'PENDING'::"MetaOutboxMessageState", $9::"MetaOperationPriority", 0, $10, NOW(), NOW(), NOW()
        ) RETURNING *`,
        randomUUID(),
        operation.id,
        cleanIdentifier(input.topic ?? 'meta.operation.execute', 'META_OUTBOX_TOPIC_INVALID', 160),
        cleanIdentifier(input.partitionKey ?? assetId ?? connectionKey, 'META_OUTBOX_PARTITION_KEY_INVALID', 255),
        input.payload.type,
        input.payload.schemaVersion,
        json(input.payload.data),
        payloadDigest,
        priority,
        Math.max(1, Math.min(input.maxDispatchAttempts ?? 10, 100)),
      );
      if (!messageRows[0]) throw new Error('META_OUTBOX_INSERT_FAILED');
      const outbox = hydrateOutbox(messageRows[0]);
      await appendEvent(tx, {
        operationId: operation.id,
        eventType: 'OUTBOX_CREATED',
        fromStatus: 'ACCEPTED',
        toStatus: 'ACCEPTED',
        safeDetails: { messageId: outbox.id, topic: outbox.topic },
      });
      return {
        created: true,
        operation,
        outbox,
        ...(businessMutation ? { businessResult } : {}),
      };
    });
  }

  async getOperation(operationId: string): Promise<MetaOperationRecord | null> {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaOperation" WHERE "id" = $1 LIMIT 1`, operationId);
    return rows[0] ? hydrateOperation(rows[0]) : null;
  }

  async getOutboxMessage(messageId: string): Promise<MetaOutboxMessageRecord | null> {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaOutboxMessage" WHERE "id" = $1 LIMIT 1`, messageId);
    return rows[0] ? hydrateOutbox(rows[0]) : null;
  }

  async listOperationEvents(operationId: string): Promise<readonly MetaOperationEventRecord[]> {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "MetaOperationEvent" WHERE "operationId" = $1 ORDER BY "sequence" ASC`,
      operationId,
    );
    return Object.freeze(rows.map(hydrateEvent));
  }

  async claimDueOutbox(input: { readonly limit?: number; readonly leaseMs?: number; readonly workerId?: string; readonly now?: Date } = {}): Promise<MetaClaimedOutboxBatch> {
    const leaseToken = `${input.workerId?.trim() || 'dispatcher'}:${randomUUID()}`;
    const leaseMs = Math.max(1_000, input.leaseMs ?? 60_000);
    const limit = Math.max(1, Math.min(input.limit ?? 25, 100));
    const now = input.now ?? new Date();
    return this.client.$transaction(async (tx) => {
      const expiredRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT operation.* FROM "MetaOperation" AS operation
         INNER JOIN "MetaOutboxMessage" AS message ON message."operationId" = operation."id"
         WHERE operation."expiresAt" <= $1
           AND operation."status" NOT IN ('SUCCEEDED', 'PERMANENT_FAILURE', 'QUARANTINED', 'CANCELLED')
           AND message."state" IN ('PENDING', 'RETRY_SCHEDULED', 'CLAIMED')
         ORDER BY operation."expiresAt" ASC
         FOR UPDATE OF operation SKIP LOCKED
         LIMIT 100`,
        now,
      );
      for (const row of expiredRows) {
        const operation = hydrateOperation(row);
        await tx.$queryRawUnsafe(
          `UPDATE "MetaOutboxMessage"
           SET "state" = 'DEAD_LETTER'::"MetaOutboxMessageState",
               "lastError" = $2::jsonb, "leaseToken" = NULL, "leaseExpiresAt" = NULL, "updatedAt" = NOW()
           WHERE "operationId" = $1`,
          operation.id,
          json({ code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The Meta operation expired before dispatch.', retryable: false, category: 'TIMEOUT' }),
        );
        await transitionOperation(tx, {
          operationId: operation.id,
          toStatus: 'PERMANENT_FAILURE',
          eventType: 'OPERATION_EXPIRED',
          error: { code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The Meta operation expired before dispatch.', retryable: false, category: 'TIMEOUT' },
          complete: true,
          safeDetails: { expiresAt: operation.expiresAt },
        });
      }
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `WITH candidates AS (
          SELECT message."id" FROM "MetaOutboxMessage" AS message
          INNER JOIN "MetaOperation" AS operation ON operation."id" = message."operationId"
          WHERE message."state" IN ('PENDING', 'RETRY_SCHEDULED', 'CLAIMED')
            AND message."availableAt" <= $1
            AND (message."leaseExpiresAt" IS NULL OR message."leaseExpiresAt" <= $1)
            AND operation."expiresAt" > $1
          ORDER BY message."priority" ASC, message."availableAt" ASC, message."createdAt" ASC
          FOR UPDATE OF message SKIP LOCKED
          LIMIT $2
        )
        UPDATE "MetaOutboxMessage" AS message
        SET "state" = 'CLAIMED'::"MetaOutboxMessageState",
            "leaseToken" = $3,
            "leaseExpiresAt" = $1 + ($4 * INTERVAL '1 millisecond'),
            "updatedAt" = NOW()
        FROM candidates
        WHERE message."id" = candidates."id"
        RETURNING message.*`,
        now,
        limit,
        leaseToken,
        leaseMs,
      );
      const messages = rows.map(hydrateOutbox);
      for (const message of messages) {
        const operation = await lockOperation(tx, message.operationId);
        if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
        if (operation.status === 'ACCEPTED' || operation.status === 'RETRYABLE_FAILURE') {
          await transitionOperation(tx, {
            operationId: operation.id,
            toStatus: 'DISPATCHING',
            eventType: 'OUTBOX_CLAIMED',
            safeDetails: { messageId: message.id, leaseMs },
          });
        } else {
          await appendEvent(tx, {
            operationId: operation.id,
            eventType: 'OUTBOX_CLAIMED',
            fromStatus: operation.status,
            toStatus: operation.status,
            attempt: operation.attempts,
            safeDetails: { messageId: message.id, leaseMs },
          });
        }
      }
      return Object.freeze({ leaseToken, messages: Object.freeze(messages) });
    });
  }

  async markOutboxPublished(input: { readonly messageId: string; readonly leaseToken: string; readonly publishedAt?: Date; readonly safeDetails?: Readonly<Record<string, unknown>> }): Promise<MetaOutboxMessageRecord | null> {
    return this.client.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE "MetaOutboxMessage"
         SET "state" = 'PUBLISHED'::"MetaOutboxMessageState", "publishedAt" = $3,
             "leaseToken" = NULL, "leaseExpiresAt" = NULL, "lastError" = NULL, "updatedAt" = NOW()
         WHERE "id" = $1 AND "state" = 'CLAIMED' AND "leaseToken" = $2
         RETURNING *`,
        input.messageId,
        input.leaseToken,
        input.publishedAt ?? new Date(),
      );
      if (!rows[0]) return null;
      const message = hydrateOutbox(rows[0]);
      const operation = await lockOperation(tx, message.operationId);
      if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
      if (operation.status === 'DISPATCHING') {
        await transitionOperation(tx, { operationId: operation.id, toStatus: 'QUEUED', eventType: 'OUTBOX_PUBLISHED', safeDetails: input.safeDetails });
      } else {
        await appendEvent(tx, { operationId: operation.id, eventType: 'OUTBOX_PUBLISHED', fromStatus: operation.status, toStatus: operation.status, attempt: operation.attempts, safeDetails: input.safeDetails });
      }
      return message;
    });
  }

  async releaseOutbox(input: { readonly messageId: string; readonly leaseToken: string; readonly error: MetaOperationSafeError; readonly availableAt: Date }): Promise<MetaOutboxMessageRecord | null> {
    return this.client.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE "MetaOutboxMessage"
         SET "attempts" = "attempts" + 1,
             "state" = CASE WHEN $5 = false OR "attempts" + 1 >= "maxAttempts"
               THEN 'DEAD_LETTER'::"MetaOutboxMessageState"
               ELSE 'RETRY_SCHEDULED'::"MetaOutboxMessageState" END,
             "availableAt" = $3, "lastError" = $4::jsonb,
             "leaseToken" = NULL, "leaseExpiresAt" = NULL, "updatedAt" = NOW()
         WHERE "id" = $1 AND "state" = 'CLAIMED' AND "leaseToken" = $2
         RETURNING *`,
        input.messageId,
        input.leaseToken,
        input.availableAt,
        json(input.error),
        input.error.retryable,
      );
      if (!rows[0]) return null;
      const message = hydrateOutbox(rows[0]);
      const operation = await lockOperation(tx, message.operationId);
      if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
      if (message.state === 'DEAD_LETTER' && !isMetaOperationTerminal(operation.status)) {
        await transitionOperation(tx, {
          operationId: operation.id,
          toStatus: 'PERMANENT_FAILURE',
          eventType: 'OUTBOX_RELEASED',
          error: input.error,
          complete: true,
          safeDetails: { code: input.error.code, deadLetter: true },
        });
      } else if (operation.status === 'DISPATCHING') {
        await transitionOperation(tx, {
          operationId: operation.id,
          toStatus: 'ACCEPTED',
          eventType: 'OUTBOX_RELEASED',
          error: input.error,
          safeDetails: { code: input.error.code, availableAt: message.availableAt },
        });
      } else {
        await appendEvent(tx, { operationId: operation.id, eventType: 'OUTBOX_RELEASED', fromStatus: operation.status, toStatus: operation.status, attempt: operation.attempts, safeDetails: { code: input.error.code, availableAt: message.availableAt } });
      }
      return message;
    });
  }

  async quarantineOutbox(input: { readonly messageId: string; readonly leaseToken?: string; readonly reason: string; readonly error?: MetaOperationSafeError }): Promise<MetaOutboxMessageRecord | null> {
    return this.client.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE "MetaOutboxMessage"
         SET "state" = 'QUARANTINED'::"MetaOutboxMessageState", "quarantineReason" = $3,
             "lastError" = $4::jsonb, "leaseToken" = NULL, "leaseExpiresAt" = NULL, "updatedAt" = NOW()
         WHERE "id" = $1 AND ($2::text IS NULL OR "leaseToken" = $2)
         RETURNING *`,
        input.messageId,
        input.leaseToken ?? null,
        cleanIdentifier(input.reason, 'META_OUTBOX_QUARANTINE_REASON_INVALID', 500),
        json(input.error),
      );
      if (!rows[0]) return null;
      const message = hydrateOutbox(rows[0]);
      const operation = await lockOperation(tx, message.operationId);
      if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
      if (!isMetaOperationTerminal(operation.status)) {
        await transitionOperation(tx, {
          operationId: operation.id,
          toStatus: 'QUARANTINED',
          eventType: 'PAYLOAD_QUARANTINED',
          error: input.error ?? null,
          complete: true,
          safeDetails: { reason: input.reason, code: input.error?.code },
        });
      }
      return message;
    });
  }

  async beginExecution(input: { readonly operationId: string; readonly workerId?: string; readonly leaseMs?: number; readonly now?: Date }): Promise<MetaOperationExecutionClaim> {
    return this.client.$transaction(async (tx) => {
      const operation = await lockOperation(tx, input.operationId);
      if (!operation) throw new Error('META_OPERATION_NOT_FOUND');
      const now = input.now ?? new Date();
      if (new Date(operation.expiresAt).getTime() <= now.getTime() && !isMetaOperationTerminal(operation.status)) {
        const expired = await transitionOperation(tx, {
          operationId: operation.id,
          toStatus: 'PERMANENT_FAILURE',
          eventType: 'OPERATION_EXPIRED',
          error: { code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The Meta operation expired before execution.', retryable: false, category: 'TIMEOUT' },
          clearExecutionLease: true,
          complete: true,
          safeDetails: { expiresAt: operation.expiresAt },
        });
        return { claimed: false, duplicate: false, terminal: true, operation: expired };
      }
      if (operation.status === 'SUCCEEDED') {
        await appendEvent(tx, { operationId: operation.id, eventType: 'DUPLICATE_IGNORED', fromStatus: 'SUCCEEDED', toStatus: 'SUCCEEDED', attempt: operation.attempts, safeDetails: { reason: 'ALREADY_SUCCEEDED' } });
        return { claimed: false, duplicate: true, terminal: true, operation };
      }
      if (isMetaOperationTerminal(operation.status)) return { claimed: false, duplicate: false, terminal: true, operation };
      if (operation.status === 'RUNNING' && operation.executionLeaseExpiresAt && new Date(operation.executionLeaseExpiresAt).getTime() > now.getTime()) {
        return { claimed: false, duplicate: true, terminal: false, operation };
      }
      if (!['QUEUED', 'RETRYABLE_FAILURE', 'RUNNING'].includes(operation.status)) {
        return { claimed: false, duplicate: true, terminal: false, operation };
      }
      if (operation.status !== 'RUNNING') assertMetaOperationTransition(operation.status, 'RUNNING');
      const leaseToken = `${input.workerId?.trim() || 'worker'}:${randomUUID()}`;
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE "MetaOperation"
         SET "status" = 'RUNNING'::"MetaOperationStatus", "attempts" = "attempts" + 1,
             "executionLeaseToken" = $2,
             "executionLeaseExpiresAt" = $3 + ($4 * INTERVAL '1 millisecond'),
             "startedAt" = COALESCE("startedAt", $3), "updatedAt" = NOW()
         WHERE "id" = $1 RETURNING *`,
        operation.id,
        leaseToken,
        now,
        Math.max(1_000, input.leaseMs ?? 120_000),
      );
      if (!rows[0]) throw new Error('META_OPERATION_EXECUTION_CLAIM_FAILED');
      const claimed = hydrateOperation(rows[0]);
      await appendEvent(tx, { operationId: operation.id, eventType: 'EXECUTION_STARTED', fromStatus: operation.status, toStatus: 'RUNNING', attempt: claimed.attempts, safeDetails: { leaseExpiresAt: claimed.executionLeaseExpiresAt } });
      return { claimed: true, duplicate: false, terminal: false, operation: claimed, leaseToken };
    });
  }

  async completeExecution(input: { readonly operationId: string; readonly leaseToken: string; readonly result?: Readonly<Record<string, unknown>> }): Promise<MetaOperationRecord | null> {
    return this.client.$transaction(async (tx) => {
      const current = await lockOperation(tx, input.operationId);
      if (!current || current.status !== 'RUNNING' || current.executionLeaseToken !== input.leaseToken) return null;
      return transitionOperation(tx, {
        operationId: current.id,
        toStatus: 'SUCCEEDED',
        eventType: 'EXECUTION_SUCCEEDED',
        result: input.result ?? null,
        error: null,
        clearExecutionLease: true,
        complete: true,
        safeDetails: input.result,
      });
    });
  }

  async deferExecution(input: { readonly operationId: string; readonly leaseToken: string; readonly error: MetaOperationSafeError; readonly availableAt: Date }): Promise<MetaOperationRecord | null> {
    return this.client.$transaction(async (tx) => {
      const current = await lockOperation(tx, input.operationId);
      if (!current || current.status !== 'RUNNING' || current.executionLeaseToken !== input.leaseToken) return null;
      if (input.availableAt.getTime() >= new Date(current.expiresAt).getTime()) {
        return transitionOperation(tx, {
          operationId: current.id,
          toStatus: 'PERMANENT_FAILURE',
          eventType: 'OPERATION_EXPIRED',
          error: { code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The next retry would occur after operation expiry.', retryable: false, category: 'TIMEOUT' },
          clearExecutionLease: true,
          complete: true,
          safeDetails: { expiresAt: current.expiresAt },
        });
      }
      const outboxRows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE "MetaOutboxMessage"
         SET "state" = 'RETRY_SCHEDULED'::"MetaOutboxMessageState",
             "availableAt" = $2, "publishedAt" = NULL, "lastError" = $3::jsonb,
             "leaseToken" = NULL, "leaseExpiresAt" = NULL, "updatedAt" = NOW()
         WHERE "operationId" = $1
         RETURNING *`,
        current.id,
        input.availableAt,
        json(input.error),
      );
      if (!outboxRows[0]) throw new Error('META_OPERATION_OUTBOX_MISSING');
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `UPDATE "MetaOperation"
         SET "status" = 'RETRYABLE_FAILURE'::"MetaOperationStatus",
             "lastError" = $2::jsonb, "nextAttemptAt" = $3,
             "executionLeaseToken" = NULL, "executionLeaseExpiresAt" = NULL, "updatedAt" = NOW()
         WHERE "id" = $1 AND "status" = 'RUNNING'::"MetaOperationStatus"
         RETURNING *`,
        current.id,
        json(input.error),
        input.availableAt,
      );
      if (!rows[0]) return null;
      const updated = hydrateOperation(rows[0]);
      await appendEvent(tx, {
        operationId: current.id,
        eventType: 'EXECUTION_DEFERRED',
        fromStatus: 'RUNNING',
        toStatus: 'RETRYABLE_FAILURE',
        attempt: updated.attempts,
        safeDetails: { code: input.error.code, availableAt: input.availableAt.toISOString(), priority: updated.priority },
      });
      return updated;
    });
  }

  async failExecution(input: { readonly operationId: string; readonly leaseToken: string; readonly error: MetaOperationSafeError }): Promise<MetaOperationRecord | null> {
    return this.client.$transaction(async (tx) => {
      const current = await lockOperation(tx, input.operationId);
      if (!current || current.status !== 'RUNNING' || current.executionLeaseToken !== input.leaseToken) return null;
      return transitionOperation(tx, {
        operationId: current.id,
        toStatus: input.error.retryable ? 'RETRYABLE_FAILURE' : 'PERMANENT_FAILURE',
        eventType: 'EXECUTION_FAILED',
        error: input.error,
        clearExecutionLease: true,
        complete: !input.error.retryable,
        safeDetails: { code: input.error.code, retryable: input.error.retryable },
      });
    });
  }
}

export function createPrismaMetaOperationStore(): PrismaMetaOperationStore {
  return new PrismaMetaOperationStore();
}
