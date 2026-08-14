import {
  validateMetaSocialJobEnvelope,
  type MetaSocialJobEnvelopeValidationIssue,
} from './social-job-envelope.ts';
import type {
  MetaSocialJobEnvelope,
  MetaSocialPayloadReference,
} from './social-job-types.ts';

export const META_SOCIAL_QUEUE_FAILURE_CLASSES = Object.freeze([
  'RATE_LIMIT',
  'TRANSIENT',
  'AUTH',
  'PERMANENT',
  'POLICY_BLOCKED',
  'UNKNOWN_WRITE',
] as const);

export type MetaSocialQueueFailureClass = (typeof META_SOCIAL_QUEUE_FAILURE_CLASSES)[number];

export type MetaSocialQueueEnqueueResult =
  | Readonly<{
      outcome: 'ENQUEUED' | 'DEDUPLICATED';
      accepted: true;
      deduplicated: boolean;
      auditId: string;
      jobId?: string;
      status: string;
      envelope: MetaSocialJobEnvelope;
    }>
  | Readonly<{
      outcome: 'DEFERRED';
      accepted: false;
      recoverable: true;
      code: 'SOCIAL_QUEUE_UNAVAILABLE';
      retryAt: string;
      envelope: MetaSocialJobEnvelope;
    }>
  | Readonly<{
      outcome: 'REJECTED';
      accepted: false;
      recoverable: false;
      code: 'SOCIAL_QUEUE_ENVELOPE_INVALID';
      issues: readonly MetaSocialJobEnvelopeValidationIssue[];
    }>;

export type MetaSocialQueueTransportClaim = Readonly<{
  transport: 'BULLMQ';
  queueName: string;
  jobName: string;
  jobId: string;
  auditId: string | null;
  deliveryAttempt: number;
  claimedAt: string;
  envelope: MetaSocialJobEnvelope;
}>;

export type MetaSocialQueueAck = Readonly<{
  action: 'ACK';
  completedAt: string;
  resultRef?: MetaSocialPayloadReference;
}>;

export type MetaSocialQueueNack = Readonly<{
  action: 'NACK';
  classification: MetaSocialQueueFailureClass;
  safeReasonCode: string;
  retryable: boolean;
  retryAfterMs?: number;
  reconciliationRequired: boolean;
}>;

export type MetaSocialQueueHandlerResult = MetaSocialQueueAck | MetaSocialQueueNack;
export type MetaSocialQueueHandler = (claim: MetaSocialQueueTransportClaim) => Promise<MetaSocialQueueHandlerResult>;

export interface MetaSocialQueueAdapter {
  enqueue(envelope: MetaSocialJobEnvelope): Promise<MetaSocialQueueEnqueueResult>;
}

const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{2,95}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;

function asIso(value: Date | string | undefined, fallback = new Date()): string {
  const candidate = value instanceof Date ? value : value === undefined ? fallback : new Date(value);
  if (!Number.isFinite(candidate.getTime())) throw new TypeError('META_SOCIAL_QUEUE_TIME_INVALID');
  return candidate.toISOString();
}

export function createMetaSocialQueueClaim(input: {
  queueName: string;
  jobName: string;
  jobId: string;
  auditId?: string | null;
  deliveryAttempt: number;
  claimedAt?: Date | string;
  envelope: unknown;
}): MetaSocialQueueTransportClaim {
  if (!SAFE_ID_PATTERN.test(input.queueName)) throw new TypeError('META_SOCIAL_QUEUE_NAME_INVALID');
  if (!SAFE_ID_PATTERN.test(input.jobName)) throw new TypeError('META_SOCIAL_QUEUE_JOB_NAME_INVALID');
  if (!SAFE_ID_PATTERN.test(input.jobId)) throw new TypeError('META_SOCIAL_QUEUE_JOB_ID_INVALID');
  if (input.auditId !== undefined && input.auditId !== null && !SAFE_ID_PATTERN.test(input.auditId)) {
    throw new TypeError('META_SOCIAL_QUEUE_AUDIT_ID_INVALID');
  }
  if (!Number.isSafeInteger(input.deliveryAttempt) || input.deliveryAttempt < 1 || input.deliveryAttempt > 1_000) {
    throw new TypeError('META_SOCIAL_QUEUE_DELIVERY_ATTEMPT_INVALID');
  }
  const validation = validateMetaSocialJobEnvelope(input.envelope);
  if (!validation.valid) {
    const error = new TypeError('META_SOCIAL_QUEUE_CLAIM_ENVELOPE_INVALID');
    Object.assign(error, { issues: validation.issues });
    throw error;
  }
  return Object.freeze({
    transport: 'BULLMQ' as const,
    queueName: input.queueName,
    jobName: input.jobName,
    jobId: input.jobId,
    auditId: input.auditId ?? null,
    deliveryAttempt: input.deliveryAttempt,
    claimedAt: asIso(input.claimedAt),
    envelope: validation.envelope,
  });
}

export function ackMetaSocialQueueJob(input: {
  completedAt?: Date | string;
  resultRef?: MetaSocialPayloadReference;
} = {}): MetaSocialQueueAck {
  if (input.resultRef) {
    if (!SAFE_ID_PATTERN.test(input.resultRef.id) || !SAFE_ID_PATTERN.test(input.resultRef.kind)) {
      throw new TypeError('META_SOCIAL_QUEUE_ACK_RESULT_REFERENCE_INVALID');
    }
  }
  return Object.freeze({
    action: 'ACK' as const,
    completedAt: asIso(input.completedAt),
    ...(input.resultRef ? { resultRef: Object.freeze({ ...input.resultRef }) } : {}),
  });
}

export function nackMetaSocialQueueJob(input: {
  classification: MetaSocialQueueFailureClass;
  safeReasonCode: string;
  retryAfterMs?: number;
}): MetaSocialQueueNack {
  if (!META_SOCIAL_QUEUE_FAILURE_CLASSES.includes(input.classification as never)) {
    throw new TypeError('META_SOCIAL_QUEUE_FAILURE_CLASS_INVALID');
  }
  if (!SAFE_REASON_PATTERN.test(input.safeReasonCode)) {
    throw new TypeError('META_SOCIAL_QUEUE_SAFE_REASON_INVALID');
  }
  if (input.retryAfterMs !== undefined && (!Number.isSafeInteger(input.retryAfterMs) || input.retryAfterMs < 0 || input.retryAfterMs > 7 * 24 * 60 * 60 * 1_000)) {
    throw new TypeError('META_SOCIAL_QUEUE_RETRY_AFTER_INVALID');
  }
  const retryable = input.classification === 'RATE_LIMIT' || input.classification === 'TRANSIENT';
  const reconciliationRequired = input.classification === 'UNKNOWN_WRITE';
  if (!retryable && input.retryAfterMs !== undefined) {
    throw new TypeError('META_SOCIAL_QUEUE_RETRY_AFTER_FORBIDDEN');
  }
  return Object.freeze({
    action: 'NACK' as const,
    classification: input.classification,
    safeReasonCode: input.safeReasonCode,
    retryable,
    ...(input.retryAfterMs === undefined ? {} : { retryAfterMs: input.retryAfterMs }),
    reconciliationRequired,
  });
}
