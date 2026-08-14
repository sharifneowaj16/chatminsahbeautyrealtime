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

export type MetaLeadReceiptProcessorInput = Readonly<{
  receiptId: string;
  leadgenId: string;
  pageId?: string;
  formId?: string;
  now?: Date;
}>;

export type MetaLeadReceiptProcessor = (input: MetaLeadReceiptProcessorInput) => Promise<unknown>;

export type MetaLeadProcessingJobExecutionResult =
  | Readonly<{
      outcome: 'ACK';
      queueResult: MetaSocialQueueAck;
      value: unknown;
    }>
  | Readonly<{
      outcome: 'NACK';
      queueResult: MetaSocialQueueNack;
    }>;

export type MetaLeadJobFailureDecision = Readonly<{
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
  const candidate = error as { code?: unknown; errorCode?: unknown };
  const raw = String(candidate?.code ?? candidate?.errorCode ?? 'META_LEAD_PROCESSING_FAILED')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return SAFE_REASON_PATTERN.test(raw) ? raw : 'META_LEAD_PROCESSING_FAILED';
}

function errorRecord(error: unknown): Readonly<Record<string, unknown>> {
  return typeof error === 'object' && error !== null ? error as Readonly<Record<string, unknown>> : Object.freeze({});
}

function hasMarker(value: string, markers: readonly string[]): boolean {
  return markers.some((marker) => value.includes(marker));
}

export function buildMetaLeadProcessingDedupeKey(input: {
  receiptId: string;
  providerLeadId: string;
}): string {
  const receiptId = requiredId(input.receiptId, 'META_LEAD_JOB_RECEIPT_ID_INVALID');
  const providerLeadId = requiredId(input.providerLeadId, 'META_LEAD_JOB_PROVIDER_ID_INVALID');
  const digest = createHash('sha256').update(`${receiptId}\0${providerLeadId}`).digest('hex');
  return `social:process-meta-lead:${digest}`;
}

export function createMetaLeadProcessingJobEnvelope(input: {
  receiptId: string;
  providerLeadId: string;
  pageId?: string | null;
  formId?: string | null;
  correlationId: string;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  attemptNumber?: number;
  scheduledAt?: Date | string;
}): MetaSocialJobEnvelope {
  const receiptId = requiredId(input.receiptId, 'META_LEAD_JOB_RECEIPT_ID_INVALID');
  const providerLeadId = requiredId(input.providerLeadId, 'META_LEAD_JOB_PROVIDER_ID_INVALID');
  const pageId = optionalId(input.pageId, 'META_LEAD_JOB_PAGE_ID_INVALID');
  const formId = optionalId(input.formId, 'META_LEAD_JOB_FORM_ID_INVALID');
  const connectionKey = optionalId(input.connectionKey, 'META_LEAD_JOB_CONNECTION_KEY_INVALID');

  return createMetaSocialJobEnvelope({
    jobType: 'PROCESS_META_LEAD',
    receiptId,
    attemptNumber: input.attemptNumber,
    correlationId: input.correlationId,
    scheduledAt: input.scheduledAt,
    dedupeKey: buildMetaLeadProcessingDedupeKey({ receiptId, providerLeadId }),
    payloadRef: {
      kind: 'WEBHOOK_RECEIPT',
      id: receiptId,
      providerObjectId: providerLeadId,
      ...((pageId || formId) ? {
        scope: {
          ...(pageId ? { pageId } : {}),
          ...(formId ? { formId } : {}),
        },
      } : {}),
    },
    observability: {
      component: 'meta-social-lead-worker',
      operation: 'process-meta-lead',
      platform: 'LEAD_ADS',
      ...(input.environment ? { environment: input.environment } : {}),
      ...(connectionKey ? { connectionKey } : {}),
    },
  });
}

export async function enqueueMetaLeadProcessingJob(input: {
  adapter: MetaSocialQueueAdapter;
  receiptId: string;
  providerLeadId: string;
  pageId?: string | null;
  formId?: string | null;
  correlationId: string;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  attemptNumber?: number;
  scheduledAt?: Date | string;
}): Promise<Readonly<{
  envelope: MetaSocialJobEnvelope;
  result: MetaSocialQueueEnqueueResult;
}>> {
  const envelope = createMetaLeadProcessingJobEnvelope(input);
  const result = await input.adapter.enqueue(envelope);
  return Object.freeze({ envelope, result });
}

export function classifyMetaLeadJobFailure(error: unknown): MetaLeadJobFailureDecision {
  const record = errorRecord(error);
  const reason = safeReasonCode(error);
  const name = String(record.name ?? (error instanceof Error ? error.name : '')).toUpperCase();
  const code = String(record.code ?? record.errorCode ?? '').toUpperCase();
  const status = extractProviderErrorStatus(error);
  const retryAfterMs = extractRetryAfterMs(error);
  const permanent = record.permanent === true || name === 'METALEADPERMANENTPROCESSINGERROR';

  if (status === 429 || hasMarker(code, ['RATE_LIMIT', 'THROTTLE']) || ['4', '17', '32', '613'].includes(code)) {
    return Object.freeze({ classification: 'RATE_LIMIT', safeReasonCode: reason, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
  }

  if (status === 401 || status === 403 || code === '190'
    || hasMarker(code, ['TOKEN', 'AUTH', 'ACCESS_DENIED', 'PERMISSION'])) {
    return Object.freeze({ classification: 'AUTH', safeReasonCode: reason });
  }

  if (hasMarker(code, [
    'OWNERSHIP', 'ALLOWLIST', 'SCOPE_MISMATCH', 'RECEIPT_FORM_MISMATCH',
    'RECEIPT_LEAD_MISMATCH', 'PAGE_MISMATCH', 'FORM_MISMATCH', 'POLICY_BLOCKED',
  ])) {
    return Object.freeze({ classification: 'POLICY_BLOCKED', safeReasonCode: reason });
  }

  if (permanent || record.retryable === false) {
    return Object.freeze({ classification: 'PERMANENT', safeReasonCode: reason });
  }

  const providerClass = classifyMetaProviderError(error);
  if (providerClass === 'AUTH') return Object.freeze({ classification: 'AUTH', safeReasonCode: reason });
  if (providerClass === 'PERMANENT') return Object.freeze({ classification: 'PERMANENT', safeReasonCode: reason });
  if (providerClass === 'RATE_LIMIT') {
    return Object.freeze({ classification: 'RATE_LIMIT', safeReasonCode: reason, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
  }
  return Object.freeze({ classification: 'TRANSIENT', safeReasonCode: reason, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
}

export async function executeMetaLeadProcessingJob(input: {
  claim: MetaSocialQueueTransportClaim;
  processReceipt: MetaLeadReceiptProcessor;
  now?: Date;
}): Promise<MetaLeadProcessingJobExecutionResult> {
  const { claim } = input;
  if (claim.envelope.jobType !== 'PROCESS_META_LEAD') {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({
        classification: 'PERMANENT',
        safeReasonCode: 'META_LEAD_JOB_TYPE_INVALID',
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
        safeReasonCode: 'META_LEAD_JOB_REFERENCE_INVALID',
      }),
    });
  }

  try {
    const value = await input.processReceipt({
      receiptId,
      leadgenId: payloadRef.providerObjectId,
      ...(payloadRef.scope?.pageId ? { pageId: payloadRef.scope.pageId } : {}),
      ...(payloadRef.scope?.formId ? { formId: payloadRef.scope.formId } : {}),
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
    const failure = classifyMetaLeadJobFailure(error);
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob(failure),
    });
  }
}
