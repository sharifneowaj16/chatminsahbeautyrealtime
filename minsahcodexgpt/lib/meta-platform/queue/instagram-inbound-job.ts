import { createHash } from 'node:crypto';
import {
  classifyMetaProviderError,
  extractProviderErrorStatus,
  extractRetryAfterMs,
} from '../../jobs/retry-policy.ts';
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
import type {
  MetaSocialJobEnvironment,
  MetaSocialJobEnvelope,
} from './social-job-types.ts';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{2,95}$/;

export type MetaInstagramInboundProcessorInput = Readonly<{
  receiptId: string;
  providerMessageId: string;
  accountId?: string;
  now?: Date;
}>;

export type MetaInstagramInboundProcessor = (
  input: MetaInstagramInboundProcessorInput,
) => Promise<unknown>;

export type MetaInstagramInboundJobExecutionResult =
  | Readonly<{
      outcome: 'ACK';
      queueResult: MetaSocialQueueAck;
      value: unknown;
    }>
  | Readonly<{
      outcome: 'NACK';
      queueResult: MetaSocialQueueNack;
    }>;

export type MetaInstagramInboundFailureDecision = Readonly<{
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

function errorRecord(error: unknown): Readonly<Record<string, unknown>> {
  return typeof error === 'object' && error !== null
    ? error as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function safeReasonCode(error: unknown): string {
  const candidate = error as { code?: unknown; errorCode?: unknown };
  const messagePrefix = error instanceof Error ? error.message.split(':')[0] : '';
  const raw = String(candidate?.code ?? candidate?.errorCode ?? messagePrefix ?? 'INSTAGRAM_INBOUND_PROCESSING_FAILED')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return SAFE_REASON_PATTERN.test(raw) ? raw : 'INSTAGRAM_INBOUND_PROCESSING_FAILED';
}

function hasMarker(value: string, markers: readonly string[]): boolean {
  return markers.some((marker) => value.includes(marker));
}

export function buildMetaInstagramInboundDedupeKey(input: {
  receiptId: string;
  providerMessageId: string;
}): string {
  const receiptId = requiredId(input.receiptId, 'META_INSTAGRAM_INBOUND_RECEIPT_ID_INVALID');
  const providerMessageId = requiredId(input.providerMessageId, 'META_INSTAGRAM_INBOUND_PROVIDER_MESSAGE_ID_INVALID');
  const digest = createHash('sha256').update(`${receiptId}\0${providerMessageId}`).digest('hex');
  return `social:process-instagram-inbound:${digest}`;
}

export function createMetaInstagramInboundJobEnvelope(input: {
  receiptId: string;
  providerMessageId: string;
  accountId?: string | null;
  correlationId: string;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  attemptNumber?: number;
  scheduledAt?: Date | string;
}): MetaSocialJobEnvelope {
  const receiptId = requiredId(input.receiptId, 'META_INSTAGRAM_INBOUND_RECEIPT_ID_INVALID');
  const providerMessageId = requiredId(input.providerMessageId, 'META_INSTAGRAM_INBOUND_PROVIDER_MESSAGE_ID_INVALID');
  const accountId = optionalId(input.accountId, 'META_INSTAGRAM_INBOUND_ACCOUNT_ID_INVALID');
  const connectionKey = optionalId(input.connectionKey, 'META_INSTAGRAM_INBOUND_CONNECTION_KEY_INVALID');

  return createMetaSocialJobEnvelope({
    jobType: 'PROCESS_INSTAGRAM_INBOUND',
    receiptId,
    attemptNumber: input.attemptNumber,
    correlationId: input.correlationId,
    scheduledAt: input.scheduledAt,
    dedupeKey: buildMetaInstagramInboundDedupeKey({ receiptId, providerMessageId }),
    payloadRef: {
      kind: 'WEBHOOK_RECEIPT',
      id: receiptId,
      providerObjectId: providerMessageId,
      ...(accountId ? { scope: { accountId } } : {}),
    },
    observability: {
      component: 'meta-social-instagram-worker',
      operation: 'process-instagram-inbound',
      platform: 'INSTAGRAM',
      ...(input.environment ? { environment: input.environment } : {}),
      ...(connectionKey ? { connectionKey } : {}),
    },
  });
}

export async function enqueueMetaInstagramInboundJob(input: {
  adapter: MetaSocialQueueAdapter;
  receiptId: string;
  providerMessageId: string;
  accountId?: string | null;
  correlationId: string;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  attemptNumber?: number;
  scheduledAt?: Date | string;
}): Promise<Readonly<{
  envelope: MetaSocialJobEnvelope;
  result: MetaSocialQueueEnqueueResult;
}>> {
  const envelope = createMetaInstagramInboundJobEnvelope(input);
  const result = await input.adapter.enqueue(envelope);
  return Object.freeze({ envelope, result });
}

export function classifyMetaInstagramInboundFailure(error: unknown): MetaInstagramInboundFailureDecision {
  const record = errorRecord(error);
  const reason = safeReasonCode(error);
  const code = String(record.code ?? record.errorCode ?? reason).toUpperCase();
  const status = extractProviderErrorStatus(error);
  const retryAfterMs = extractRetryAfterMs(error);

  if (status === 429 || hasMarker(code, ['RATE_LIMIT', 'THROTTLE']) || ['4', '17', '32', '613'].includes(code)) {
    return Object.freeze({
      classification: 'RATE_LIMIT',
      safeReasonCode: reason,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }

  if (status === 401 || status === 403 || code === '190'
    || hasMarker(code, ['TOKEN', 'AUTH', 'ACCESS_DENIED', 'PERMISSION'])) {
    return Object.freeze({ classification: 'AUTH', safeReasonCode: reason });
  }

  if (hasMarker(code, [
    'ACCOUNT_MISMATCH', 'ACCOUNT_IDENTITY_REQUIRED', 'ACCOUNT_IDENTITY',
    'CONVERSATION_ACCOUNT_MISMATCH', 'CONVERSATION_PARTICIPANT_MISMATCH',
    'PARTICIPANT_MISMATCH', 'SCOPE_MISMATCH', 'POLICY_BLOCKED',
  ])) {
    return Object.freeze({ classification: 'POLICY_BLOCKED', safeReasonCode: reason });
  }

  if (record.permanent === true || record.retryable === false || hasMarker(code, [
    'EVENT_', 'REFERENCE_INVALID', 'RECEIPT_NOT_FOUND', 'RECEIPT_TERMINAL',
    'PAYLOAD_DIGEST_MISMATCH', 'MESSAGE_PAYLOAD_DIGEST_MISMATCH',
  ])) {
    return Object.freeze({ classification: 'PERMANENT', safeReasonCode: reason });
  }

  const providerClass = classifyMetaProviderError(error);
  if (providerClass === 'AUTH') return Object.freeze({ classification: 'AUTH', safeReasonCode: reason });
  if (providerClass === 'PERMANENT') return Object.freeze({ classification: 'PERMANENT', safeReasonCode: reason });
  if (providerClass === 'RATE_LIMIT') {
    return Object.freeze({
      classification: 'RATE_LIMIT',
      safeReasonCode: reason,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }
  return Object.freeze({
    classification: 'TRANSIENT',
    safeReasonCode: reason,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  });
}

export async function executeMetaInstagramInboundJob(input: {
  claim: MetaSocialQueueTransportClaim;
  processReceipt: MetaInstagramInboundProcessor;
  now?: Date;
}): Promise<MetaInstagramInboundJobExecutionResult> {
  const { claim } = input;
  if (claim.envelope.jobType !== 'PROCESS_INSTAGRAM_INBOUND') {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({
        classification: 'PERMANENT',
        safeReasonCode: 'META_INSTAGRAM_INBOUND_JOB_TYPE_INVALID',
      }),
    });
  }

  const receiptId = claim.envelope.receiptId;
  const payloadRef = claim.envelope.payloadRef;
  if (!receiptId || payloadRef.kind !== 'WEBHOOK_RECEIPT' || payloadRef.id !== receiptId || !payloadRef.providerObjectId) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({
        classification: 'PERMANENT',
        safeReasonCode: 'META_INSTAGRAM_INBOUND_REFERENCE_INVALID',
      }),
    });
  }

  try {
    const value = await input.processReceipt({
      receiptId,
      providerMessageId: payloadRef.providerObjectId,
      ...(payloadRef.scope?.accountId ? { accountId: payloadRef.scope.accountId } : {}),
      ...(input.now ? { now: input.now } : {}),
    });
    return Object.freeze({
      outcome: 'ACK' as const,
      queueResult: ackMetaSocialQueueJob({
        completedAt: input.now,
        resultRef: {
          kind: 'WEBHOOK_RECEIPT',
          id: receiptId,
          providerObjectId: payloadRef.providerObjectId,
        },
      }),
      value,
    });
  } catch (error) {
    const failure = classifyMetaInstagramInboundFailure(error);
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob(failure),
    });
  }
}
