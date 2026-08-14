import { createHash } from 'node:crypto';
import { buildReplayIdempotencyKey } from '../../jobs/idempotency.ts';
import { validateMetaJobPayload, type MetaJobPayload } from '../../jobs/job-types.ts';
import type { MetaJobAuditRecord } from '../../jobs/audit-repository.ts';
import { createMetaSocialJobEnvelope } from './social-job-envelope.ts';
import { ackMetaSocialQueueJob, nackMetaSocialQueueJob, type MetaSocialQueueAck, type MetaSocialQueueNack, type MetaSocialQueueTransportClaim } from './social-queue-adapter.ts';
import { metaSocialJobDedupePrefix, type MetaSocialJobEnvelope } from './social-job-types.ts';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const REPLAYABLE_STATUSES = new Set(['DEAD_LETTER', 'FAILED', 'CANCELLED']);

export type MetaSocialReplayExecutionResult =
  | Readonly<{ outcome: 'ACK'; queueResult: MetaSocialQueueAck; value: Readonly<{ originalAuditId: string; replayAuditId: string; replayJobId?: string }> }>
  | Readonly<{ outcome: 'NACK'; queueResult: MetaSocialQueueNack }>;

export type MetaSocialReplayDependencies = Readonly<{
  getAudit(auditId: string): Promise<MetaJobAuditRecord | null>;
  enqueue(input: {
    queueName: MetaJobAuditRecord['queueName'];
    jobName: MetaJobAuditRecord['jobName'];
    payload: Omit<MetaJobPayload, 'auditId'>;
    sourceId?: string;
    requestedBy?: string;
    replayOfId?: string;
  }): Promise<Readonly<{ auditId: string; jobId?: string }>>;
  incrementReplayCount(auditId: string): Promise<unknown>;
}>;

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) throw new TypeError(code);
  return value;
}

function unknownOutcomeMarker(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return /UNKNOWN[_ -]?(WRITE|OUTCOME)|RECONCILIATION[_ -]?REQUIRED/i.test(value);
  if (Array.isArray(value)) return value.some(unknownOutcomeMarker);
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .some(([key, nested]) => unknownOutcomeMarker(key) || unknownOutcomeMarker(nested));
  return false;
}

export function buildMetaSocialReplayRequestDedupeKey(input: {
  originalAuditId: string;
  approvalId: string;
}): string {
  const originalAuditId = requiredId(input.originalAuditId, 'META_SOCIAL_REPLAY_AUDIT_ID_INVALID');
  const approvalId = requiredId(input.approvalId, 'META_SOCIAL_REPLAY_APPROVAL_ID_INVALID');
  const digest = createHash('sha256').update(`${originalAuditId}\0${approvalId}`).digest('hex');
  return `social:replay-social-event:${digest}`;
}

export function createMetaSocialReplayJobEnvelope(input: {
  originalAuditId: string;
  approvalId: string;
  correlationId: string;
  environment?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  scheduledAt?: Date | string;
}): MetaSocialJobEnvelope {
  const originalAuditId = requiredId(input.originalAuditId, 'META_SOCIAL_REPLAY_AUDIT_ID_INVALID');
  const approvalId = requiredId(input.approvalId, 'META_SOCIAL_REPLAY_APPROVAL_ID_INVALID');
  return createMetaSocialJobEnvelope({
    jobType: 'REPLAY_SOCIAL_EVENT',
    receiptId: null,
    correlationId: input.correlationId,
    scheduledAt: input.scheduledAt,
    dedupeKey: buildMetaSocialReplayRequestDedupeKey({ originalAuditId, approvalId }),
    payloadRef: {
      kind: 'META_JOB_AUDIT',
      id: originalAuditId,
      digest: createHash('sha256').update(approvalId).digest('hex'),
    },
    observability: {
      component: 'meta-social-replay-worker',
      operation: 'replay-social-event',
      platform: 'META',
      ...(input.environment ? { environment: input.environment } : {}),
      parentAuditId: originalAuditId,
    },
  });
}

function buildReplayedSocialPayload(input: {
  original: MetaJobAuditRecord;
  replayRequestAuditId: string;
  correlationId: string;
  now: Date;
}): Omit<MetaJobPayload, 'auditId'> {
  const payload = { ...input.original.payload } as MetaJobPayload & { auditId?: string };
  delete payload.auditId;
  const originalEnvelope = 'socialEnvelope' in payload && payload.socialEnvelope
    ? payload.socialEnvelope
    : undefined;
  const genericReplayKey = buildReplayIdempotencyKey(input.original.id, input.replayRequestAuditId);
  const replayKey = originalEnvelope
    ? `${metaSocialJobDedupePrefix(originalEnvelope.jobType)}replay:${createHash('sha256').update(genericReplayKey).digest('hex')}`
    : genericReplayKey;
  const replayPayload = {
    ...payload,
    idempotencyKey: replayKey,
    requestedAt: input.now.toISOString(),
    correlationId: input.correlationId,
    ...(originalEnvelope ? {
      socialEnvelope: {
        ...originalEnvelope,
        attemptNumber: Math.min(1_000, originalEnvelope.attemptNumber + 1),
        correlationId: input.correlationId,
        scheduledAt: input.now.toISOString(),
        dedupeKey: replayKey,
        observability: {
          ...originalEnvelope.observability,
          parentAuditId: input.original.id,
          traceId: input.replayRequestAuditId,
        },
      },
    } : {}),
  } as Omit<MetaJobPayload, 'auditId'>;
  const validation = validateMetaJobPayload({
    queueName: input.original.queueName,
    jobName: input.original.jobName,
    payload: replayPayload,
  });
  if (!validation.valid) {
    const error = new TypeError('META_SOCIAL_REPLAY_STORED_PAYLOAD_INVALID');
    Object.assign(error, { issues: validation.issues });
    throw error;
  }
  return validation.payload as Omit<MetaJobPayload, 'auditId'>;
}

export async function executeMetaSocialReplayJob(input: {
  claim: MetaSocialQueueTransportClaim;
  dependencies: MetaSocialReplayDependencies;
  requestedBy?: string;
  now?: Date;
}): Promise<MetaSocialReplayExecutionResult> {
  const envelope = input.claim.envelope;
  if (envelope.jobType !== 'REPLAY_SOCIAL_EVENT' || envelope.payloadRef.kind !== 'META_JOB_AUDIT') {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({ classification: 'PERMANENT', safeReasonCode: 'META_SOCIAL_REPLAY_REFERENCE_INVALID' }),
    });
  }
  const original = await input.dependencies.getAudit(envelope.payloadRef.id);
  if (!original) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({ classification: 'PERMANENT', safeReasonCode: 'META_SOCIAL_REPLAY_SOURCE_NOT_FOUND' }),
    });
  }
  if (!REPLAYABLE_STATUSES.has(original.status)) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({ classification: 'POLICY_BLOCKED', safeReasonCode: 'META_SOCIAL_REPLAY_SOURCE_NOT_REPLAYABLE' }),
    });
  }
  if (original.jobName === 'social-event-replay') {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({ classification: 'POLICY_BLOCKED', safeReasonCode: 'META_SOCIAL_REPLAY_RECURSION_BLOCKED' }),
    });
  }
  if (unknownOutcomeMarker(original.lastError)) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({ classification: 'UNKNOWN_WRITE', safeReasonCode: 'META_SOCIAL_UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED' }),
    });
  }

  try {
    const now = input.now ?? new Date();
    if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_REPLAY_TIME_INVALID');
    const replayRequestAuditId = requiredId(input.claim.auditId, 'META_SOCIAL_REPLAY_REQUEST_AUDIT_ID_REQUIRED');
    const payload = buildReplayedSocialPayload({
      original,
      replayRequestAuditId,
      correlationId: envelope.correlationId,
      now,
    });
    const replay = await input.dependencies.enqueue({
      queueName: original.queueName,
      jobName: original.jobName,
      payload,
      ...(original.sourceId ? { sourceId: original.sourceId } : {}),
      ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
      replayOfId: original.id,
    });
    await input.dependencies.incrementReplayCount(original.id);
    return Object.freeze({
      outcome: 'ACK' as const,
      queueResult: ackMetaSocialQueueJob({
        completedAt: now,
        resultRef: { kind: 'META_JOB_AUDIT', id: replay.auditId },
      }),
      value: Object.freeze({
        originalAuditId: original.id,
        replayAuditId: replay.auditId,
        ...(replay.jobId ? { replayJobId: replay.jobId } : {}),
      }),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'META_SOCIAL_REPLAY_FAILED';
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({
        classification: code.includes('STORED_PAYLOAD_INVALID') ? 'PERMANENT' : 'TRANSIENT',
        safeReasonCode: code.includes('STORED_PAYLOAD_INVALID') ? 'META_SOCIAL_REPLAY_STORED_PAYLOAD_INVALID' : 'META_SOCIAL_REPLAY_ENQUEUE_FAILED',
      }),
    });
  }
}
