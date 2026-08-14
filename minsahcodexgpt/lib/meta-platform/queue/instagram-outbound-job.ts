import { createHash } from 'node:crypto';
import {
  classifyMetaProviderError,
  extractProviderErrorStatus,
  extractRetryAfterMs,
} from '../../jobs/retry-policy.ts';
import { isInstagramWriteOutcomeUnknown } from '../repositories/instagram-outbound.ts';
import { createMetaSocialJobEnvelope } from './social-job-envelope.ts';
import {
  ackMetaSocialQueueJob,
  nackMetaSocialQueueJob,
  type MetaSocialQueueAck,
  type MetaSocialQueueAdapter,
  type MetaSocialQueueEnqueueResult,
  type MetaSocialQueueFailureClass,
  type MetaSocialQueueNack,
  type MetaSocialQueueTransportClaim,
} from './social-queue-adapter.ts';
import type { MetaSocialJobEnvironment, MetaSocialJobEnvelope } from './social-job-types.ts';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{2,95}$/;

export type MetaInstagramOutboundMode = 'MESSAGE' | 'PRIVATE_REPLY';

export type MetaInstagramOutboundProcessorInput = Readonly<{
  attemptId: string;
  mode: MetaInstagramOutboundMode;
  now?: Date;
}>;

export type MetaInstagramOutboundProcessor = (
  input: MetaInstagramOutboundProcessorInput,
) => Promise<unknown>;

export type MetaInstagramOutboundJobExecutionResult =
  | Readonly<{ outcome: 'ACK'; queueResult: MetaSocialQueueAck; value: unknown }>
  | Readonly<{ outcome: 'NACK'; queueResult: MetaSocialQueueNack }>;

export type MetaInstagramOutboundFailureDecision = Readonly<{
  classification: MetaSocialQueueFailureClass;
  safeReasonCode: string;
  retryAfterMs?: number;
}>;

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) throw new TypeError(code);
  return value;
}

function optionalId(value: unknown, code: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredId(value, code);
}

function safeReasonCode(error: unknown): string {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const messagePrefix = error instanceof Error ? error.message.split(':')[0] : '';
  const raw = String(row.code ?? row.errorCode ?? messagePrefix ?? 'INSTAGRAM_OUTBOUND_FAILED')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return SAFE_REASON_PATTERN.test(raw) ? raw : 'INSTAGRAM_OUTBOUND_FAILED';
}

function hasMarker(value: string, markers: readonly string[]): boolean {
  return markers.some((marker) => value.includes(marker));
}

export function buildMetaInstagramOutboundDedupeKey(input: {
  attemptId: string;
  mode: MetaInstagramOutboundMode;
}): string {
  const attemptId = requiredId(input.attemptId, 'META_INSTAGRAM_OUTBOUND_ATTEMPT_ID_INVALID');
  const digest = createHash('sha256').update(`${input.mode}\0${attemptId}`).digest('hex');
  return input.mode === 'PRIVATE_REPLY'
    ? `social:send-instagram-private-reply:${digest}`
    : `social:send-instagram-reply:${digest}`;
}

export function createMetaInstagramOutboundJobEnvelope(input: {
  attemptId: string;
  mode: MetaInstagramOutboundMode;
  conversationId: string;
  accountId?: string | null;
  messageId?: string | null;
  commentId?: string | null;
  correlationId: string;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  attemptNumber?: number;
  scheduledAt?: Date | string;
}): MetaSocialJobEnvelope {
  const attemptId = requiredId(input.attemptId, 'META_INSTAGRAM_OUTBOUND_ATTEMPT_ID_INVALID');
  const conversationId = requiredId(input.conversationId, 'META_INSTAGRAM_OUTBOUND_CONVERSATION_ID_INVALID');
  const accountId = optionalId(input.accountId, 'META_INSTAGRAM_OUTBOUND_ACCOUNT_ID_INVALID');
  const messageId = optionalId(input.messageId, 'META_INSTAGRAM_OUTBOUND_MESSAGE_ID_INVALID');
  const commentId = optionalId(input.commentId, 'META_INSTAGRAM_OUTBOUND_COMMENT_ID_INVALID');
  const connectionKey = optionalId(input.connectionKey, 'META_INSTAGRAM_OUTBOUND_CONNECTION_KEY_INVALID');
  if (input.mode === 'PRIVATE_REPLY' && !commentId) {
    throw new TypeError('META_INSTAGRAM_PRIVATE_REPLY_COMMENT_ID_REQUIRED');
  }

  return createMetaSocialJobEnvelope({
    jobType: input.mode === 'PRIVATE_REPLY' ? 'SEND_INSTAGRAM_PRIVATE_REPLY' : 'SEND_INSTAGRAM_REPLY',
    receiptId: null,
    attemptNumber: input.attemptNumber,
    correlationId: input.correlationId,
    scheduledAt: input.scheduledAt,
    dedupeKey: buildMetaInstagramOutboundDedupeKey({ attemptId, mode: input.mode }),
    payloadRef: {
      kind: 'INSTAGRAM_REPLY_ATTEMPT',
      id: attemptId,
      scope: {
        conversationId,
        ...(accountId ? { accountId } : {}),
        ...(messageId ? { messageId } : {}),
        ...(commentId ? { commentId } : {}),
      },
    },
    observability: {
      component: 'meta-social-instagram-worker',
      operation: input.mode === 'PRIVATE_REPLY' ? 'send-instagram-private-reply' : 'send-instagram-reply',
      platform: 'INSTAGRAM',
      ...(input.environment ? { environment: input.environment } : {}),
      ...(connectionKey ? { connectionKey } : {}),
    },
  });
}

export async function enqueueMetaInstagramOutboundJob(input: {
  adapter: MetaSocialQueueAdapter;
  attemptId: string;
  mode: MetaInstagramOutboundMode;
  conversationId: string;
  accountId?: string | null;
  messageId?: string | null;
  commentId?: string | null;
  correlationId: string;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  attemptNumber?: number;
  scheduledAt?: Date | string;
}): Promise<Readonly<{ envelope: MetaSocialJobEnvelope; result: MetaSocialQueueEnqueueResult }>> {
  const envelope = createMetaInstagramOutboundJobEnvelope(input);
  const result = await input.adapter.enqueue(envelope);
  return Object.freeze({ envelope, result });
}

export function classifyMetaInstagramOutboundFailure(error: unknown): MetaInstagramOutboundFailureDecision {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const reason = safeReasonCode(error);
  const code = String(row.code ?? row.errorCode ?? reason).toUpperCase();
  const status = extractProviderErrorStatus(error);
  const retryAfterMs = extractRetryAfterMs(error);

  if (row.unknownOutcome === true || code === 'UNKNOWN_OUTCOME' || hasMarker(code, [
    'WRITE_OUTCOME_UNKNOWN', 'MESSAGE_ID_MISSING', 'RECONCILIATION_REQUIRED',
  ]) || isInstagramWriteOutcomeUnknown(error)) {
    return Object.freeze({ classification: 'UNKNOWN_WRITE', safeReasonCode: reason });
  }
  if (status === 429 || hasMarker(code, ['RATE_LIMIT', 'THROTTLE']) || ['4', '17', '32', '613'].includes(code)) {
    return Object.freeze({
      classification: 'RATE_LIMIT', safeReasonCode: reason,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }
  if (status === 401 || status === 403 || code === '190' || hasMarker(code, ['TOKEN', 'AUTH', 'PERMISSION'])) {
    return Object.freeze({ classification: 'AUTH', safeReasonCode: reason });
  }
  if (hasMarker(code, [
    'REPLY_BLOCKED', 'WINDOW_EXPIRED', 'PRIVATE_REPLY_ALREADY', 'PRIVATE_REPLY_SOURCE',
    'KILL_SWITCH', 'WRITES_DISABLED', 'ACCOUNT_MISMATCH', 'CONVERSATION_CLOSED',
    'RESERVATION_NOT_FOUND', 'NOT_SENDABLE',
  ])) {
    return Object.freeze({ classification: 'POLICY_BLOCKED', safeReasonCode: reason });
  }
  if (row.permanent === true || row.retryable === false || hasMarker(code, [
    'ATTEMPT_NOT_FOUND', 'REFERENCE_INVALID', 'PAYLOAD_MISMATCH', 'TEXT_INVALID', 'MODE_INVALID',
  ])) {
    return Object.freeze({ classification: 'PERMANENT', safeReasonCode: reason });
  }

  const providerClass = classifyMetaProviderError(error);
  if (providerClass === 'AUTH') return Object.freeze({ classification: 'AUTH', safeReasonCode: reason });
  if (providerClass === 'PERMANENT') return Object.freeze({ classification: 'PERMANENT', safeReasonCode: reason });
  if (providerClass === 'RATE_LIMIT') {
    return Object.freeze({
      classification: 'RATE_LIMIT', safeReasonCode: reason,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }
  return Object.freeze({
    classification: 'TRANSIENT', safeReasonCode: reason,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  });
}

export async function executeMetaInstagramOutboundJob(input: {
  claim: MetaSocialQueueTransportClaim;
  processAttempt: MetaInstagramOutboundProcessor;
  now?: Date;
}): Promise<MetaInstagramOutboundJobExecutionResult> {
  const expectedMode: MetaInstagramOutboundMode | null = input.claim.envelope.jobType === 'SEND_INSTAGRAM_REPLY'
    ? 'MESSAGE'
    : input.claim.envelope.jobType === 'SEND_INSTAGRAM_PRIVATE_REPLY' ? 'PRIVATE_REPLY' : null;
  const ref = input.claim.envelope.payloadRef;
  if (!expectedMode || ref.kind !== 'INSTAGRAM_REPLY_ATTEMPT' || !ref.scope?.conversationId) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({
        classification: 'PERMANENT',
        safeReasonCode: 'META_INSTAGRAM_OUTBOUND_REFERENCE_INVALID',
      }),
    });
  }
  if (expectedMode === 'PRIVATE_REPLY' && !ref.scope.commentId) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({
        classification: 'PERMANENT',
        safeReasonCode: 'META_INSTAGRAM_PRIVATE_REPLY_REFERENCE_INVALID',
      }),
    });
  }
  try {
    const value = await input.processAttempt({ attemptId: ref.id, mode: expectedMode, ...(input.now ? { now: input.now } : {}) });
    return Object.freeze({
      outcome: 'ACK' as const,
      queueResult: ackMetaSocialQueueJob({
        completedAt: input.now,
        resultRef: { kind: 'INSTAGRAM_REPLY_ATTEMPT', id: ref.id },
      }),
      value,
    });
  } catch (error) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob(classifyMetaInstagramOutboundFailure(error)),
    });
  }
}
