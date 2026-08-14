import { createHash, randomUUID } from 'node:crypto';
import {
  createMetaSocialFailureResult,
  createMetaSocialSuccessResult,
  type MetaSocialPlatformResult,
} from '../contracts/social-result';
import { createMetaSocialProviderError, type MetaSocialProviderErrorKind } from '../errors/social-errors';
import {
  normalizeMetaSocialWebhookLifecycleActor,
  resolveMetaSocialWebhookLeaseWindow,
} from './webhook-receipt-claims';
import type {
  MetaSocialWebhookReceiptQueryExecutor,
  MetaSocialWebhookReceiptRow,
} from './webhook-receipts';

const ROW_COLUMN_NAMES = Object.freeze([
  'id', 'provider', 'platform', 'environment', 'connectionKey', 'providerDeliveryId',
  'providerEventKey', 'payloadDigest', 'lastPayloadDigest', 'digestMismatchCount', 'lastDigestMismatchAt', 'lastDigestMismatchCode', 'safeMetadata',
  'retentionClass', 'retentionUntil', 'dedupeRetainUntil', 'metadataPrunedAt',
  'receivedAt', 'firstSeenAt', 'lastSeenAt', 'duplicateCount', 'state', 'queueName',
  'jobReference', 'attemptCount', 'lastAttemptAt', 'nextRetryAt', 'failureCode',
  'failureCategory', 'failureSummary', 'deadLetteredAt', 'leaseToken', 'leaseOwner',
  'leaseExpiresAt', 'queuedAt', 'processingStartedAt', 'processedAt', 'blockedAt',
  'failedAt', 'lastTransitionAt', 'lastTransitionCode', 'lastTransitionActor', 'stateVersion',
  'correlationId', 'parentReceiptId', 'replayAttempt', 'replayReason', 'replayRequestedBy',
  'replayRequestedAt', 'replayEligibility', 'replaySourceType', 'replaySourceId', 'replaySourceExpiresAt',
  'replayApprovalId', 'replayApprovedBy', 'replayApprovedAt', 'replayApprovalReference', 'replayCompletedAt', 'replayResultCode',
  'legacyReceiptType', 'legacyReceiptId', 'primaryIdentityReferenceId', 'normalizedLeadId', 'instagramMessageId', 'createdAt', 'updatedAt',
] as const);

const RECEIPT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;

function columns(alias?: string): string {
  return ROW_COLUMN_NAMES.map((name) => `${alias ? `${alias}.` : ''}"${name}"`).join(', ');
}

function required(value: unknown, code: string, maxLength: number): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function receiptId(value: unknown): string {
  const normalized = required(value, 'META_SOCIAL_WEBHOOK_RECEIPT_ID_INVALID', 128);
  if (!RECEIPT_ID_PATTERN.test(normalized)) throw new TypeError('META_SOCIAL_WEBHOOK_RECEIPT_ID_INVALID');
  return normalized;
}

function safeCode(value: unknown, code: string): string {
  const normalized = required(value, code, 80).toUpperCase();
  if (!SAFE_CODE_PATTERN.test(normalized)) throw new TypeError(code);
  return normalized;
}

function safeSummary(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return required(value, 'META_SOCIAL_WEBHOOK_FAILURE_SUMMARY_INVALID', 500)
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/EA[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s()-]{7,}\d/g, '[REDACTED_PHONE]')
    .slice(0, 500);
}

function date(value: Date | undefined, code: string): Date {
  const normalized = value ? new Date(value) : new Date();
  if (!Number.isFinite(normalized.getTime())) throw new TypeError(code);
  return normalized;
}

function immutableRow(row: MetaSocialWebhookReceiptRow): MetaSocialWebhookReceiptRow {
  return Object.freeze({ ...row, safeMetadata: Object.freeze({ ...row.safeMetadata }) });
}

function success<T>(operation: string, correlationId: string | null | undefined, value: T) {
  return createMetaSocialSuccessResult({
    domain: 'WEBHOOK',
    operation,
    ...(correlationId ? { correlationId } : {}),
    value,
  });
}

function failure(
  operation: string,
  sourceCode: string,
  correlationId?: string | null,
  kind: MetaSocialProviderErrorKind = 'CONFLICT',
  retryAfterMs?: number,
) {
  return createMetaSocialFailureResult(createMetaSocialProviderError({
    domain: 'WEBHOOK',
    operation,
    requestKind: 'WEBHOOK',
    kind,
    sourceCode,
    ...(correlationId ? { correlationId } : {}),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  }));
}

const FIND_BY_ID_SQL = `SELECT ${columns()} FROM "MetaSocialWebhookReceipt" WHERE "id"=$1 LIMIT 1`;
const FIND_BY_LEGACY_SQL = `SELECT ${columns()} FROM "MetaSocialWebhookReceipt"
  WHERE "legacyReceiptType"=$1 AND "legacyReceiptId"=$2 LIMIT 1`;

const MARK_QUEUED_SQL = `
WITH candidate AS (
  SELECT "id", "state", "queueName", "jobReference"
  FROM "MetaSocialWebhookReceipt"
  WHERE "id"=$1
  FOR UPDATE
), updated AS (
  UPDATE "MetaSocialWebhookReceipt" AS receipt
  SET "state"='QUEUED'::"MetaSocialWebhookReceiptState",
      "queueName"=$2,
      "jobReference"=$3,
      "queuedAt"=COALESCE(receipt."queuedAt", $5),
      "nextRetryAt"=NULL,
      "failureCode"=NULL,
      "failureCategory"=NULL,
      "failureSummary"=NULL,
      "lastTransitionAt"=$5,
      "lastTransitionCode"='QUEUE_HANDOFF_COMPLETED',
      "lastTransitionActor"=$4,
      "stateVersion"=receipt."stateVersion" + CASE WHEN candidate."state"='QUEUED' THEN 0 ELSE 1 END,
      "updatedAt"=$5
  FROM candidate
  WHERE receipt."id"=candidate."id"
    AND (
      candidate."state"='RECEIVED'
      OR (candidate."state"='QUEUED' AND candidate."queueName"=$2 AND candidate."jobReference"=$3)
    )
  RETURNING ${columns('receipt')}, (candidate."state"='QUEUED') AS "idempotent"
)
SELECT * FROM updated`;

const MARK_BLOCKED_SQL = `
UPDATE "MetaSocialWebhookReceipt" AS receipt
SET "state"='BLOCKED'::"MetaSocialWebhookReceiptState",
    "blockedAt"=$4,
    "replayCompletedAt"=CASE WHEN receipt."replayAttempt">0 THEN $4 ELSE receipt."replayCompletedAt" END,
    "replayResultCode"=CASE WHEN receipt."replayAttempt">0 THEN 'BLOCKED' ELSE receipt."replayResultCode" END,
    "failureCode"=$2,
    "failureCategory"='POLICY',
    "nextRetryAt"=NULL,
    "leaseToken"=NULL,
    "leaseOwner"=NULL,
    "leaseExpiresAt"=NULL,
    "lastTransitionAt"=$4,
    "lastTransitionCode"='PRE_PROCESSING_BLOCKED',
    "lastTransitionActor"=$3,
    "stateVersion"=receipt."stateVersion" + 1,
    "updatedAt"=$4
WHERE receipt."id"=$1 AND receipt."state"='RECEIVED'
RETURNING ${columns('receipt')}`;

const CLAIM_SQL = `
WITH candidate AS (
  SELECT "id", "state", "leaseExpiresAt"
  FROM "MetaSocialWebhookReceipt"
  WHERE "id"=$1
    AND (
      "state"='QUEUED'
      OR ("state"='PROCESSING' AND "leaseExpiresAt" IS NOT NULL AND "leaseExpiresAt" <= $5)
    )
  FOR UPDATE SKIP LOCKED
), updated AS (
  UPDATE "MetaSocialWebhookReceipt" AS receipt
  SET "state"='PROCESSING'::"MetaSocialWebhookReceiptState",
      "attemptCount"=receipt."attemptCount" + 1,
      "lastAttemptAt"=$5,
      "processingStartedAt"=$5,
      "leaseToken"=$2,
      "leaseOwner"=$3,
      "leaseExpiresAt"=$4,
      "failureCode"=NULL,
      "failureCategory"=NULL,
      "failureSummary"=NULL,
      "nextRetryAt"=NULL,
      "lastTransitionAt"=$5,
      "lastTransitionCode"=CASE WHEN candidate."state"='PROCESSING'
        THEN 'PROCESSING_RECLAIMED' ELSE 'PROCESSING_CLAIMED' END,
      "lastTransitionActor"=$3,
      "stateVersion"=receipt."stateVersion" + 1,
      "updatedAt"=$5
  FROM candidate
  WHERE receipt."id"=candidate."id"
  RETURNING ${columns('receipt')}, (candidate."state"='PROCESSING') AS "reclaimed"
)
SELECT * FROM updated`;

const RENEW_LEASE_SQL = `
UPDATE "MetaSocialWebhookReceipt" AS receipt
SET "leaseExpiresAt"=$5,
    "lastTransitionAt"=$4,
    "lastTransitionCode"='PROCESSING_LEASE_RENEWED',
    "lastTransitionActor"=$3,
    "stateVersion"=receipt."stateVersion" + 1,
    "updatedAt"=$4
WHERE receipt."id"=$1
  AND receipt."state"='PROCESSING'
  AND receipt."leaseToken"=$2
  AND receipt."leaseOwner"=$3
  AND receipt."leaseExpiresAt" > $4
RETURNING ${columns('receipt')}`;

const MARK_PROCESSED_SQL = `
UPDATE "MetaSocialWebhookReceipt" AS receipt
SET "state"='PROCESSED'::"MetaSocialWebhookReceiptState",
    "processedAt"=$4,
    "replayCompletedAt"=CASE WHEN receipt."replayAttempt">0 THEN $4 ELSE receipt."replayCompletedAt" END,
    "replayResultCode"=CASE WHEN receipt."replayAttempt">0 THEN 'PROCESSED' ELSE receipt."replayResultCode" END,
    "nextRetryAt"=NULL,
    "failureCode"=NULL,
    "failureCategory"=NULL,
    "failureSummary"=NULL,
    "leaseToken"=NULL,
    "leaseOwner"=NULL,
    "leaseExpiresAt"=NULL,
    "lastTransitionAt"=$4,
    "lastTransitionCode"='PROCESSING_COMPLETED',
    "lastTransitionActor"=$3,
    "stateVersion"=receipt."stateVersion" + 1,
    "updatedAt"=$4
WHERE receipt."id"=$1 AND receipt."state"='PROCESSING' AND receipt."leaseToken"=$2
RETURNING ${columns('receipt')}`;

const MARK_FAILED_SQL = `
UPDATE "MetaSocialWebhookReceipt" AS receipt
SET "state"='FAILED'::"MetaSocialWebhookReceiptState",
    "failedAt"=$8,
    "failureCode"=$3,
    "failureCategory"=$4,
    "failureSummary"=$5,
    "nextRetryAt"=$6,
    "leaseToken"=NULL,
    "leaseOwner"=NULL,
    "leaseExpiresAt"=NULL,
    "lastTransitionAt"=$8,
    "lastTransitionCode"='PROCESSING_FAILED',
    "lastTransitionActor"=$7,
    "stateVersion"=receipt."stateVersion" + 1,
    "updatedAt"=$8
WHERE receipt."id"=$1 AND receipt."state"='PROCESSING' AND receipt."leaseToken"=$2
RETURNING ${columns('receipt')}`;

const REQUEUE_FAILED_SQL = `
UPDATE "MetaSocialWebhookReceipt" AS receipt
SET "state"='QUEUED'::"MetaSocialWebhookReceiptState",
    "queueName"=COALESCE($2, receipt."queueName"),
    "jobReference"=COALESCE($3, receipt."jobReference"),
    "queuedAt"=$5,
    "nextRetryAt"=NULL,
    "lastTransitionAt"=$5,
    "lastTransitionCode"='RETRY_QUEUED',
    "lastTransitionActor"=$4,
    "stateVersion"=receipt."stateVersion" + 1,
    "updatedAt"=$5
WHERE receipt."id"=$1
  AND receipt."state"='FAILED'
  AND (receipt."nextRetryAt" IS NULL OR receipt."nextRetryAt" <= $5)
  AND COALESCE($2, receipt."queueName") IS NOT NULL
  AND COALESCE($3, receipt."jobReference") IS NOT NULL
RETURNING ${columns('receipt')}`;

const MARK_DEAD_LETTERED_SQL = `
UPDATE "MetaSocialWebhookReceipt" AS receipt
SET "state"='DEAD_LETTERED'::"MetaSocialWebhookReceiptState",
    "failureCode"=$2,
    "failureCategory"='DEAD_LETTER',
    "failureSummary"=$3,
    "deadLetteredAt"=$5,
    "replayCompletedAt"=CASE WHEN receipt."replayAttempt">0 THEN $5 ELSE receipt."replayCompletedAt" END,
    "replayResultCode"=CASE WHEN receipt."replayAttempt">0 THEN 'DEAD_LETTERED' ELSE receipt."replayResultCode" END,
    "retentionClass"='EXTENDED_FAILURE'::"MetaSocialWebhookRetentionClass",
    "retentionUntil"=GREATEST(receipt."retentionUntil", $5 + INTERVAL '180 days'),
    "dedupeRetainUntil"=GREATEST(receipt."dedupeRetainUntil", $5 + INTERVAL '730 days'),
    "replayEligibility"=CASE
      WHEN COALESCE(receipt."failureCode", '') ~* 'UNKNOWN[_-]?OUTCOME' OR COALESCE(receipt."failureCategory", '') ~* 'UNKNOWN[_-]?OUTCOME' THEN 'UNKNOWN_OUTCOME_BLOCKED'::"MetaSocialWebhookReplayEligibility"
      WHEN receipt."replaySourceType"='NONE'::"MetaSocialWebhookReplaySourceType" OR receipt."replaySourceId" IS NULL THEN 'SOURCE_UNAVAILABLE'::"MetaSocialWebhookReplayEligibility"
      WHEN receipt."replaySourceExpiresAt" IS NOT NULL AND receipt."replaySourceExpiresAt" <= $5 THEN 'SOURCE_EXPIRED'::"MetaSocialWebhookReplayEligibility"
      ELSE 'APPROVAL_REQUIRED'::"MetaSocialWebhookReplayEligibility" END,
    "nextRetryAt"=NULL,
    "leaseToken"=NULL,
    "leaseOwner"=NULL,
    "leaseExpiresAt"=NULL,
    "lastTransitionAt"=$5,
    "lastTransitionCode"='RETRY_EXHAUSTED',
    "lastTransitionActor"=$4,
    "stateVersion"=receipt."stateVersion" + 1,
    "updatedAt"=$5
WHERE receipt."id"=$1 AND receipt."state"='FAILED'
RETURNING ${columns('receipt')}`;

const CREATE_REPLAY_SQL = `
WITH original AS (
  SELECT receipt.*, approval."id" AS "verifiedApprovalId", approval."approvedById" AS "verifiedApprovedBy",
         approval."reviewedAt" AS "verifiedApprovedAt"
  FROM "MetaSocialWebhookReceipt" receipt
  JOIN "MetaAdminApproval" approval ON approval."id"=$7
    AND approval."status"='APPROVED'::"MetaAdminApprovalStatus"
    AND approval."actionKey"='META_SOCIAL_WEBHOOK_REPLAY'
    AND approval."resourceType"='META_SOCIAL_WEBHOOK_RECEIPT'
    AND approval."resourceId"=receipt."id"
    AND approval."approvedById"=$8
    AND approval."reviewedAt"=$9
    AND approval."expiresAt">$11
    AND approval."requestedById"<>approval."approvedById"
  WHERE receipt."id"=$1 AND receipt."state"='DEAD_LETTERED'
    AND receipt."replaySourceType"<>'NONE'::"MetaSocialWebhookReplaySourceType"
    AND receipt."replaySourceId" IS NOT NULL
    AND (receipt."replaySourceExpiresAt" IS NULL OR receipt."replaySourceExpiresAt">$11)
    AND NOT (COALESCE(receipt."failureCode", '') ~* 'UNKNOWN[_-]?OUTCOME' OR COALESCE(receipt."failureCategory", '') ~* 'UNKNOWN[_-]?OUTCOME')
  FOR UPDATE OF receipt
), next_attempt AS (
  SELECT COALESCE(MAX("replayAttempt"), 0) + 1 AS attempt
  FROM "MetaSocialWebhookReceipt"
  WHERE "parentReceiptId"=$1
), inserted AS (
  INSERT INTO "MetaSocialWebhookReceipt" (
    "id", "provider", "platform", "environment", "connectionKey", "providerDeliveryId",
    "providerEventKey", "payloadDigest", "lastPayloadDigest", "safeMetadata", "receivedAt",
    "firstSeenAt", "lastSeenAt", "state", "correlationId", "retentionClass", "retentionUntil", "dedupeRetainUntil",
    "parentReceiptId", "replayAttempt", "replayReason", "replayRequestedBy", "replayRequestedAt",
    "replayEligibility", "replaySourceType", "replaySourceId", "replaySourceExpiresAt",
    "replayApprovalId", "replayApprovedBy", "replayApprovedAt", "replayApprovalReference",
    "lastTransitionAt", "lastTransitionCode", "lastTransitionActor", "createdAt", "updatedAt"
  )
  SELECT $2, original."provider", original."platform", original."environment", original."connectionKey",
    original."providerDeliveryId", $3, original."payloadDigest", original."payloadDigest",
    original."safeMetadata", $11, $11, $11, 'RECEIVED'::"MetaSocialWebhookReceiptState", $6,
    'REPLAY_AUDIT'::"MetaSocialWebhookRetentionClass", $11 + INTERVAL '365 days', $11 + INTERVAL '730 days',
    original."id", next_attempt.attempt, $4, $5, $11, 'ELIGIBLE'::"MetaSocialWebhookReplayEligibility",
    original."replaySourceType", original."replaySourceId", original."replaySourceExpiresAt",
    original."verifiedApprovalId", original."verifiedApprovedBy", original."verifiedApprovedAt", $10,
    $11, 'CONTROLLED_REPLAY_CREATED', $5, $11, $11
  FROM original CROSS JOIN next_attempt
  ON CONFLICT ("provider", "platform", "environment", "connectionKey", "providerEventKey") DO NOTHING
  RETURNING ${columns()}
), existing AS (
  SELECT ${columns('receipt')}
  FROM "MetaSocialWebhookReceipt" AS receipt
  JOIN original ON receipt."provider"=original."provider"
    AND receipt."platform"=original."platform"
    AND receipt."environment"=original."environment"
    AND receipt."connectionKey"=original."connectionKey"
  WHERE receipt."providerEventKey"=$3 AND receipt."replayApprovalId"=$7
  LIMIT 1
), selected AS (
  SELECT *, true AS "created" FROM inserted
  UNION ALL
  SELECT *, false AS "created" FROM existing WHERE NOT EXISTS (SELECT 1 FROM inserted)
)
SELECT * FROM selected LIMIT 1`;

export function createMetaSocialWebhookReceiptLifecycleRepository(
  executor: MetaSocialWebhookReceiptQueryExecutor,
) {
  return Object.freeze({
    async getById(idValue: string): Promise<MetaSocialWebhookReceiptRow | null> {
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(FIND_BY_ID_SQL, receiptId(idValue));
      return rows[0] ? immutableRow(rows[0]) : null;
    },

    async findByLegacyReceipt(input: {
      readonly legacyReceiptType: string;
      readonly legacyReceiptId: string;
    }): Promise<MetaSocialWebhookReceiptRow | null> {
      const type = required(input.legacyReceiptType, 'META_SOCIAL_WEBHOOK_LEGACY_TYPE_INVALID', 80);
      const id = receiptId(input.legacyReceiptId);
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(FIND_BY_LEGACY_SQL, type, id);
      return rows[0] ? immutableRow(rows[0]) : null;
    },

    async markQueued(input: {
      readonly receiptId: string;
      readonly queueName: string;
      readonly jobReference: string;
      readonly actor: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<Readonly<{ receipt: MetaSocialWebhookReceiptRow; idempotent: boolean }>>> {
      const operation = 'WEBHOOK_RECEIPT.MARK_QUEUED';
      const rows = await executor.query<MetaSocialWebhookReceiptRow & { idempotent: boolean }>(
        MARK_QUEUED_SQL,
        receiptId(input.receiptId),
        required(input.queueName, 'META_SOCIAL_WEBHOOK_QUEUE_NAME_INVALID', 160),
        required(input.jobReference, 'META_SOCIAL_WEBHOOK_JOB_REFERENCE_INVALID', 256),
        normalizeMetaSocialWebhookLifecycleActor(input.actor),
        date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID'),
      );
      const row = rows[0];
      if (!row) return failure(operation, 'RECEIPT_QUEUE_TRANSITION_REJECTED');
      return success(operation, row.correlationId, Object.freeze({ receipt: immutableRow(row), idempotent: row.idempotent }));
    },

    async markBlocked(input: {
      readonly receiptId: string;
      readonly reasonCode: string;
      readonly actor: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<MetaSocialWebhookReceiptRow>> {
      const operation = 'WEBHOOK_RECEIPT.MARK_BLOCKED';
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        MARK_BLOCKED_SQL,
        receiptId(input.receiptId),
        safeCode(input.reasonCode, 'META_SOCIAL_WEBHOOK_BLOCK_CODE_INVALID'),
        normalizeMetaSocialWebhookLifecycleActor(input.actor),
        date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID'),
      );
      const row = rows[0];
      return row ? success(operation, row.correlationId, immutableRow(row)) : failure(operation, 'RECEIPT_BLOCK_TRANSITION_REJECTED');
    },

    async claim(input: {
      readonly receiptId: string;
      readonly leaseOwner: string;
      readonly leaseMs?: number;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<Readonly<{
      receipt: MetaSocialWebhookReceiptRow;
      leaseToken: string;
      reclaimed: boolean;
    }>>> {
      const operation = 'WEBHOOK_RECEIPT.CLAIM';
      const window = resolveMetaSocialWebhookLeaseWindow(input);
      const rows = await executor.query<MetaSocialWebhookReceiptRow & { reclaimed: boolean }>(
        CLAIM_SQL,
        receiptId(input.receiptId),
        window.leaseToken,
        window.leaseOwner,
        window.leaseExpiresAt,
        window.now,
      );
      const row = rows[0];
      if (!row) return failure(operation, 'RECEIPT_NOT_CLAIMABLE', undefined, 'RATE_LIMIT', window.leaseMs);
      return success(operation, row.correlationId, Object.freeze({
        receipt: immutableRow(row),
        leaseToken: window.leaseToken,
        reclaimed: row.reclaimed,
      }));
    },

    async renewLease(input: {
      readonly receiptId: string;
      readonly leaseToken: string;
      readonly leaseOwner: string;
      readonly leaseMs?: number;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<MetaSocialWebhookReceiptRow>> {
      const operation = 'WEBHOOK_RECEIPT.RENEW_LEASE';
      const window = resolveMetaSocialWebhookLeaseWindow(input);
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        RENEW_LEASE_SQL,
        receiptId(input.receiptId),
        required(input.leaseToken, 'META_SOCIAL_WEBHOOK_LEASE_TOKEN_INVALID', 128),
        window.leaseOwner,
        window.now,
        window.leaseExpiresAt,
      );
      const row = rows[0];
      return row ? success(operation, row.correlationId, immutableRow(row)) : failure(operation, 'RECEIPT_LEASE_RENEWAL_REJECTED');
    },

    async markProcessed(input: {
      readonly receiptId: string;
      readonly leaseToken: string;
      readonly actor: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<MetaSocialWebhookReceiptRow>> {
      const operation = 'WEBHOOK_RECEIPT.MARK_PROCESSED';
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        MARK_PROCESSED_SQL,
        receiptId(input.receiptId),
        required(input.leaseToken, 'META_SOCIAL_WEBHOOK_LEASE_TOKEN_INVALID', 128),
        normalizeMetaSocialWebhookLifecycleActor(input.actor),
        date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID'),
      );
      const row = rows[0];
      return row ? success(operation, row.correlationId, immutableRow(row)) : failure(operation, 'RECEIPT_PROCESS_COMPLETION_REJECTED');
    },

    async markFailed(input: {
      readonly receiptId: string;
      readonly leaseToken: string;
      readonly failureCode: string;
      readonly failureCategory: string;
      readonly failureSummary?: string | null;
      readonly nextRetryAt?: Date | null;
      readonly actor: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<MetaSocialWebhookReceiptRow>> {
      const operation = 'WEBHOOK_RECEIPT.MARK_FAILED';
      const now = date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
      const retryAt = input.nextRetryAt == null ? null : date(input.nextRetryAt, 'META_SOCIAL_WEBHOOK_RETRY_TIME_INVALID');
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        MARK_FAILED_SQL,
        receiptId(input.receiptId),
        required(input.leaseToken, 'META_SOCIAL_WEBHOOK_LEASE_TOKEN_INVALID', 128),
        safeCode(input.failureCode, 'META_SOCIAL_WEBHOOK_FAILURE_CODE_INVALID'),
        safeCode(input.failureCategory, 'META_SOCIAL_WEBHOOK_FAILURE_CATEGORY_INVALID'),
        safeSummary(input.failureSummary),
        retryAt,
        normalizeMetaSocialWebhookLifecycleActor(input.actor),
        now,
      );
      const row = rows[0];
      return row ? success(operation, row.correlationId, immutableRow(row)) : failure(operation, 'RECEIPT_PROCESS_FAILURE_REJECTED');
    },

    async requeueFailed(input: {
      readonly receiptId: string;
      readonly queueName?: string;
      readonly jobReference?: string;
      readonly actor: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<MetaSocialWebhookReceiptRow>> {
      const operation = 'WEBHOOK_RECEIPT.REQUEUE';
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        REQUEUE_FAILED_SQL,
        receiptId(input.receiptId),
        input.queueName === undefined ? null : required(input.queueName, 'META_SOCIAL_WEBHOOK_QUEUE_NAME_INVALID', 160),
        input.jobReference === undefined ? null : required(input.jobReference, 'META_SOCIAL_WEBHOOK_JOB_REFERENCE_INVALID', 256),
        normalizeMetaSocialWebhookLifecycleActor(input.actor),
        date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID'),
      );
      const row = rows[0];
      return row ? success(operation, row.correlationId, immutableRow(row)) : failure(operation, 'RECEIPT_REQUEUE_REJECTED');
    },

    async markDeadLettered(input: {
      readonly receiptId: string;
      readonly failureCode: string;
      readonly failureSummary?: string | null;
      readonly actor: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<MetaSocialWebhookReceiptRow>> {
      const operation = 'WEBHOOK_RECEIPT.DEAD_LETTER';
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        MARK_DEAD_LETTERED_SQL,
        receiptId(input.receiptId),
        safeCode(input.failureCode, 'META_SOCIAL_WEBHOOK_FAILURE_CODE_INVALID'),
        safeSummary(input.failureSummary),
        normalizeMetaSocialWebhookLifecycleActor(input.actor),
        date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID'),
      );
      const row = rows[0];
      return row ? success(operation, row.correlationId, immutableRow(row)) : failure(operation, 'RECEIPT_DEAD_LETTER_REJECTED');
    },

    async createReplayAttempt(input: {
      readonly originalReceiptId: string;
      readonly replayRequestKey: string;
      readonly reason: string;
      readonly actor: string;
      readonly approvalId: string;
      readonly approvedBy: string;
      readonly approvedAt: Date;
      readonly approvalReference: string;
      readonly now?: Date;
    }): Promise<MetaSocialPlatformResult<Readonly<{ receipt: MetaSocialWebhookReceiptRow; created: boolean }>>> {
      const operation = 'WEBHOOK_RECEIPT.REPLAY';
      const originalId = receiptId(input.originalReceiptId);
      const actor = normalizeMetaSocialWebhookLifecycleActor(input.actor, 'META_SOCIAL_WEBHOOK_REPLAY_ACTOR_INVALID');
      const reason = required(input.reason, 'META_SOCIAL_WEBHOOK_REPLAY_REASON_INVALID', 500);
      const approvedBy = normalizeMetaSocialWebhookLifecycleActor(input.approvedBy, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVER_INVALID');
      if (actor === approvedBy) return failure(operation, 'RECEIPT_REPLAY_TWO_PERSON_APPROVAL_REQUIRED');
      const approvalId = receiptId(input.approvalId);
      const approvalReference = required(input.approvalReference, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVAL_REFERENCE_INVALID', 256);
      const approvedAt = date(input.approvedAt, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVED_AT_INVALID');
      const requestKey = required(input.replayRequestKey, 'META_SOCIAL_WEBHOOK_REPLAY_REQUEST_KEY_INVALID', 256);
      const digest = createHash('sha256').update(requestKey).digest('hex');
      const childId = randomUUID();
      const eventKey = `replay:${originalId}:${digest.slice(0, 32)}`;
      const correlationId = `meta-replay:${digest.slice(0, 48)}`;
      const rows = await executor.query<MetaSocialWebhookReceiptRow & { created: boolean }>(
        CREATE_REPLAY_SQL,
        originalId,
        childId,
        eventKey,
        reason,
        actor,
        correlationId,
        approvalId,
        approvedBy,
        approvedAt,
        approvalReference,
        date(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID'),
      );
      const row = rows[0];
      if (!row) return failure(operation, 'RECEIPT_REPLAY_NOT_ALLOWED');
      return success(operation, row.correlationId, Object.freeze({ receipt: immutableRow(row), created: row.created }));
    },
  });
}
