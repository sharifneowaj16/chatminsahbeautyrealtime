import { createHash } from 'node:crypto';
import { extractProviderErrorStatus, extractRetryAfterMs } from '../../jobs/retry-policy.ts';
import { createMetaSocialJobEnvelope } from './social-job-envelope.ts';
import { ackMetaSocialQueueJob, nackMetaSocialQueueJob, type MetaSocialQueueAck, type MetaSocialQueueAdapter, type MetaSocialQueueEnqueueResult, type MetaSocialQueueFailureClass, type MetaSocialQueueNack, type MetaSocialQueueTransportClaim } from './social-queue-adapter.ts';
import type { MetaSocialJobEnvironment, MetaSocialJobEnvelope } from './social-job-types.ts';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) throw new TypeError(code);
  return value;
}

function optionalId(value: unknown, code: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredId(value, code);
}

export function buildMetaSocialAttachmentValidationDedupeKey(input: {
  attachmentId: string;
  sourceDigest?: string | null;
}): string {
  const attachmentId = requiredId(input.attachmentId, 'META_SOCIAL_ATTACHMENT_ID_INVALID');
  const sourceDigest = input.sourceDigest ?? '';
  if (sourceDigest && !DIGEST_PATTERN.test(sourceDigest)) throw new TypeError('META_SOCIAL_ATTACHMENT_DIGEST_INVALID');
  const digest = createHash('sha256').update(`${attachmentId}\0${sourceDigest}`).digest('hex');
  return `social:validate-social-attachment:${digest}`;
}

export function createMetaSocialAttachmentValidationJobEnvelope(input: {
  attachmentId: string;
  messageId: string;
  conversationId: string;
  accountId: string;
  correlationId: string;
  sourceDigest?: string | null;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  scheduledAt?: Date | string;
}): MetaSocialJobEnvelope {
  const attachmentId = requiredId(input.attachmentId, 'META_SOCIAL_ATTACHMENT_ID_INVALID');
  const messageId = requiredId(input.messageId, 'META_SOCIAL_ATTACHMENT_MESSAGE_ID_INVALID');
  const conversationId = requiredId(input.conversationId, 'META_SOCIAL_ATTACHMENT_CONVERSATION_ID_INVALID');
  const accountId = requiredId(input.accountId, 'META_SOCIAL_ATTACHMENT_ACCOUNT_ID_INVALID');
  const connectionKey = optionalId(input.connectionKey, 'META_SOCIAL_ATTACHMENT_CONNECTION_KEY_INVALID');
  const sourceDigest = input.sourceDigest ?? undefined;
  if (sourceDigest && !DIGEST_PATTERN.test(sourceDigest)) throw new TypeError('META_SOCIAL_ATTACHMENT_DIGEST_INVALID');

  return createMetaSocialJobEnvelope({
    jobType: 'VALIDATE_SOCIAL_ATTACHMENT',
    receiptId: null,
    correlationId: input.correlationId,
    scheduledAt: input.scheduledAt,
    dedupeKey: buildMetaSocialAttachmentValidationDedupeKey({ attachmentId, sourceDigest }),
    payloadRef: {
      kind: 'SOCIAL_ATTACHMENT',
      id: attachmentId,
      ...(sourceDigest ? { digest: sourceDigest.toLowerCase() } : {}),
      scope: { messageId, conversationId, accountId },
    },
    observability: {
      component: 'meta-social-media-worker',
      operation: 'validate-social-attachment',
      platform: 'INSTAGRAM',
      ...(input.environment ? { environment: input.environment } : {}),
      ...(connectionKey ? { connectionKey } : {}),
    },
  });
}

export async function enqueueMetaSocialAttachmentValidationJob(input: {
  adapter: MetaSocialQueueAdapter;
  attachmentId: string;
  messageId: string;
  conversationId: string;
  accountId: string;
  correlationId: string;
  sourceDigest?: string | null;
  environment?: MetaSocialJobEnvironment;
  connectionKey?: string | null;
  scheduledAt?: Date | string;
}): Promise<Readonly<{ envelope: MetaSocialJobEnvelope; result: MetaSocialQueueEnqueueResult }>> {
  const envelope = createMetaSocialAttachmentValidationJobEnvelope(input);
  const result = await input.adapter.enqueue(envelope);
  return Object.freeze({ envelope, result });
}


export type MetaSocialAttachmentValidationProcessor = (input: Readonly<{
  attachmentId: string;
  validationJobReference: string;
  expectedSourceDigest?: string;
  expectedMessageId: string;
  expectedConversationId: string;
  expectedAccountId: string;
  now?: Date;
}>) => Promise<unknown>;

export type MetaSocialAttachmentValidationFailureDecision = Readonly<{
  classification: MetaSocialQueueFailureClass;
  safeReasonCode: string;
  retryAfterMs?: number;
}>;

export type MetaSocialAttachmentValidationExecutionResult =
  | Readonly<{ outcome: 'ACK'; queueResult: MetaSocialQueueAck; value: unknown }>
  | Readonly<{ outcome: 'NACK'; queueResult: MetaSocialQueueNack }>;

function attachmentFailureCode(error: unknown): string {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const raw = String(row.code ?? row.errorCode ?? (error instanceof Error ? error.message.split(':')[0] : 'META_MEDIA_VALIDATION_FAILED'))
    .toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96);
  return /^[A-Z][A-Z0-9_]{2,95}$/.test(raw) ? raw : 'META_MEDIA_VALIDATION_FAILED';
}

export function classifyMetaSocialAttachmentValidationFailure(error: unknown): MetaSocialAttachmentValidationFailureDecision {
  const row = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  const code = attachmentFailureCode(error);
  const status = extractProviderErrorStatus(error);
  const retryAfterMs = extractRetryAfterMs(error);
  if (status === 429 || /RATE_LIMIT|THROTTL/.test(code)) {
    return Object.freeze({ classification: 'RATE_LIMIT', safeReasonCode: code, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
  }
  if (status === 401 || status === 403 || /AUTH|TOKEN|PERMISSION/.test(code)) {
    return Object.freeze({ classification: 'AUTH', safeReasonCode: code });
  }
  if (row.permanent === true || row.retryable === false || /NOT_FOUND|SCOPE_MISMATCH|DIGEST_MISMATCH|REFERENCE_INVALID/.test(code)) {
    return Object.freeze({ classification: 'PERMANENT', safeReasonCode: code });
  }
  if (/MALWARE|MIME_|SIZE_BLOCKED|URL_.*BLOCKED|HOST_BLOCKED|PRIVATE_ADDRESS|IP_LITERAL|REDIRECT_LIMIT/.test(code)) {
    return Object.freeze({ classification: 'POLICY_BLOCKED', safeReasonCode: code });
  }
  return Object.freeze({ classification: 'TRANSIENT', safeReasonCode: code, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
}

export async function executeMetaSocialAttachmentValidationJob(input: Readonly<{
  claim: MetaSocialQueueTransportClaim;
  processAttachment: MetaSocialAttachmentValidationProcessor;
  now?: Date;
}>): Promise<MetaSocialAttachmentValidationExecutionResult> {
  const ref = input.claim.envelope.payloadRef;
  const scope = ref.scope;
  if (input.claim.envelope.jobType !== 'VALIDATE_SOCIAL_ATTACHMENT'
    || ref.kind !== 'SOCIAL_ATTACHMENT'
    || !scope?.messageId || !scope.conversationId || !scope.accountId) {
    return Object.freeze({
      outcome: 'NACK' as const,
      queueResult: nackMetaSocialQueueJob({ classification: 'PERMANENT', safeReasonCode: 'META_SOCIAL_ATTACHMENT_REFERENCE_INVALID' }),
    });
  }
  try {
    const value = await input.processAttachment({
      attachmentId: ref.id,
      validationJobReference: input.claim.envelope.dedupeKey,
      ...(ref.digest ? { expectedSourceDigest: ref.digest } : {}),
      expectedMessageId: scope.messageId,
      expectedConversationId: scope.conversationId,
      expectedAccountId: scope.accountId,
      ...(input.now ? { now: input.now } : {}),
    });
    return Object.freeze({
      outcome: 'ACK' as const,
      queueResult: ackMetaSocialQueueJob({ completedAt: input.now, resultRef: { kind: 'SOCIAL_ATTACHMENT', id: ref.id, ...(ref.digest ? { digest: ref.digest } : {}) } }),
      value,
    });
  } catch (error) {
    return Object.freeze({ outcome: 'NACK' as const, queueResult: nackMetaSocialQueueJob(classifyMetaSocialAttachmentValidationFailure(error)) });
  }
}
