import { createHash, randomUUID } from 'node:crypto';

export const META_SOCIAL_WEBHOOK_PLATFORMS = ['LEAD_ADS', 'INSTAGRAM', 'FACEBOOK_PAGE'] as const;
export const META_SOCIAL_WEBHOOK_RECEIPT_STATES = [
  'RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'BLOCKED', 'FAILED', 'DEAD_LETTERED',
] as const;
export const META_SOCIAL_WEBHOOK_RECEIPT_INITIAL_STATES = ['RECEIVED', 'BLOCKED'] as const;
export const META_PLATFORM_ENVIRONMENTS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export const META_SOCIAL_WEBHOOK_RETENTION_CLASSES = ['STANDARD_WEBHOOK', 'EXTENDED_FAILURE', 'REPLAY_AUDIT', 'SECURITY_REVIEW'] as const;
export const META_SOCIAL_WEBHOOK_REPLAY_ELIGIBILITIES = ['NOT_ELIGIBLE', 'APPROVAL_REQUIRED', 'ELIGIBLE', 'SOURCE_UNAVAILABLE', 'SOURCE_EXPIRED', 'UNKNOWN_OUTCOME_BLOCKED'] as const;
export const META_SOCIAL_WEBHOOK_REPLAY_SOURCE_TYPES = ['NONE', 'LEGACY_RECEIPT', 'NORMALIZED_LEAD', 'INSTAGRAM_MESSAGE', 'DURABLE_JOB'] as const;

export const META_SOCIAL_WEBHOOK_SENSITIVE_KEY_DENYLIST = Object.freeze([
  'access_token', 'accesstoken', 'app_secret', 'appsecret', 'client_secret', 'clientsecret',
  'appsecret_proof', 'authorization', 'cookie', 'cookies', 'signature', 'x-hub-signature',
  'email', 'phone', 'mobile', 'full_name', 'fullname', 'message', 'message_text', 'comment',
  'comment_text', 'attachment_url', 'media_url', 'signed_url', 'raw_payload', 'rawpayload',
] as const);

export type MetaSocialWebhookPlatform = (typeof META_SOCIAL_WEBHOOK_PLATFORMS)[number];
export type MetaSocialWebhookReceiptState = (typeof META_SOCIAL_WEBHOOK_RECEIPT_STATES)[number];
export type MetaPlatformEnvironment = (typeof META_PLATFORM_ENVIRONMENTS)[number];
export type MetaSocialWebhookRetentionClass = (typeof META_SOCIAL_WEBHOOK_RETENTION_CLASSES)[number];
export type MetaSocialWebhookReplayEligibility = (typeof META_SOCIAL_WEBHOOK_REPLAY_ELIGIBILITIES)[number];
export type MetaSocialWebhookReplaySourceType = (typeof META_SOCIAL_WEBHOOK_REPLAY_SOURCE_TYPES)[number];


const IN_MEMORY_TRANSITIONS: Readonly<Record<MetaSocialWebhookReceiptState, readonly MetaSocialWebhookReceiptState[]>> = Object.freeze({
  RECEIVED: ['QUEUED', 'BLOCKED'],
  QUEUED: ['PROCESSING'],
  PROCESSING: ['PROCESSED', 'FAILED'],
  FAILED: ['QUEUED', 'DEAD_LETTERED'],
  PROCESSED: [],
  BLOCKED: [],
  DEAD_LETTERED: [],
});

class MetaSocialWebhookReceiptLifecycleError extends Error {
  readonly code: string;
  readonly safeDetails: Readonly<Record<string, string | number | boolean | null>>;

  constructor(code: string, message: string, safeDetails: Readonly<Record<string, string | number | boolean | null>> = {}) {
    super(message);
    this.name = 'MetaSocialWebhookReceiptLifecycleError';
    this.code = code;
    this.safeDetails = Object.freeze({ ...safeDetails });
  }
}

function assertMetaSocialWebhookReceiptTransition(from: MetaSocialWebhookReceiptState, to: MetaSocialWebhookReceiptState): void {
  if (!IN_MEMORY_TRANSITIONS[from].includes(to)) {
    throw new MetaSocialWebhookReceiptLifecycleError(
      'META_SOCIAL_WEBHOOK_TRANSITION_NOT_ALLOWED',
      `Meta social webhook receipt cannot transition from ${from} to ${to}.`,
      { fromState: from, toState: to },
    );
  }
}

function normalizeMetaSocialWebhookLifecycleActor(value: unknown, code = 'META_SOCIAL_WEBHOOK_ACTOR_INVALID'): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(normalized)) throw new TypeError(code);
  return normalized;
}

function resolveMetaSocialWebhookLeaseWindow(input: { readonly leaseOwner: string; readonly leaseMs?: number; readonly now?: Date }) {
  const leaseOwner = normalizeMetaSocialWebhookLifecycleActor(input.leaseOwner, 'META_SOCIAL_WEBHOOK_LEASE_OWNER_INVALID');
  const leaseMs = input.leaseMs ?? 5 * 60 * 1_000;
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 5_000 || leaseMs > 30 * 60 * 1_000) {
    throw new TypeError('META_SOCIAL_WEBHOOK_LEASE_DURATION_INVALID');
  }
  const now = input.now ? new Date(input.now) : new Date();
  if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
  return Object.freeze({
    leaseOwner,
    now,
    leaseToken: randomUUID(),
    leaseExpiresAt: new Date(now.getTime() + leaseMs),
  });
}

export const META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS = Object.freeze([
  'objectType', 'eventType', 'eventKind', 'eventGroup', 'routingTarget', 'objectId',
  'pageId', 'formId', 'leadgenId', 'accountId', 'senderId', 'conversationKey',
  'platformMessageId', 'providerEventId', 'providerTimestamp', 'occurredAt',
  'entryIndex', 'eventIndex', 'signatureOk', 'rejectionCode',
] as const);

type SafeMetadataKey = (typeof META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS)[number];
type SafeScalar = string | number | boolean | null;
export type MetaSocialWebhookSafeMetadata = Readonly<Partial<Record<SafeMetadataKey, SafeScalar>>>;

export type MetaSocialWebhookReceiptRow = Readonly<{
  id: string;
  provider: 'META';
  platform: MetaSocialWebhookPlatform;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  providerDeliveryId: string | null;
  providerEventKey: string;
  payloadDigest: string;
  lastPayloadDigest: string;
  digestMismatchCount: number;
  lastDigestMismatchAt: Date | null;
  lastDigestMismatchCode: string | null;
  safeMetadata: MetaSocialWebhookSafeMetadata;
  retentionClass: MetaSocialWebhookRetentionClass;
  retentionUntil: Date;
  dedupeRetainUntil: Date;
  metadataPrunedAt: Date | null;
  receivedAt: Date;
  firstSeenAt: Date;
  lastSeenAt: Date;
  duplicateCount: number;
  state: MetaSocialWebhookReceiptState;
  queueName: string | null;
  jobReference: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  failureCode: string | null;
  failureCategory: string | null;
  failureSummary: string | null;
  deadLetteredAt: Date | null;
  leaseToken: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  queuedAt: Date | null;
  processingStartedAt: Date | null;
  processedAt: Date | null;
  blockedAt: Date | null;
  failedAt: Date | null;
  lastTransitionAt: Date | null;
  lastTransitionCode: string | null;
  lastTransitionActor: string | null;
  stateVersion: number;
  correlationId: string;
  parentReceiptId: string | null;
  replayAttempt: number;
  replayReason: string | null;
  replayRequestedBy: string | null;
  replayRequestedAt: Date | null;
  replayEligibility: MetaSocialWebhookReplayEligibility;
  replaySourceType: MetaSocialWebhookReplaySourceType;
  replaySourceId: string | null;
  replaySourceExpiresAt: Date | null;
  replayApprovalId: string | null;
  replayApprovedBy: string | null;
  replayApprovedAt: Date | null;
  replayApprovalReference: string | null;
  replayCompletedAt: Date | null;
  replayResultCode: string | null;
  legacyReceiptType: string | null;
  legacyReceiptId: string | null;
  primaryIdentityReferenceId: string | null;
  normalizedLeadId: string | null;
  instagramMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateMetaSocialWebhookReceiptInput = Readonly<{
  platform: MetaSocialWebhookPlatform;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  providerDeliveryId?: string | null;
  providerEventKey: string;
  payloadDigest: string;
  safeMetadata?: Readonly<Record<string, unknown>>;
  correlationId: string;
  initialState?: MetaSocialWebhookReceiptState;
  receivedAt?: Date;
  parentReceiptId?: string | null;
  replayAttempt?: number;
  replayReason?: string | null;
  replayRequestedBy?: string | null;
  replayRequestedAt?: Date | null;
  replayEligibility?: MetaSocialWebhookReplayEligibility;
  replaySourceType?: MetaSocialWebhookReplaySourceType;
  replaySourceId?: string | null;
  replaySourceExpiresAt?: Date | null;
  replayApprovalId?: string | null;
  replayApprovedBy?: string | null;
  replayApprovedAt?: Date | null;
  replayApprovalReference?: string | null;
  legacyReceiptType?: string | null;
  legacyReceiptId?: string | null;
}>;

export type CreateMetaSocialWebhookReceiptResult = Readonly<{
  receipt: MetaSocialWebhookReceiptRow;
  created: boolean;
  duplicate: boolean;
  digestMatches: boolean;
}>;

export interface MetaSocialWebhookReceiptQueryExecutor {
  query<T>(sql: string, ...values: unknown[]): Promise<readonly T[]>;
}

const CONNECTION_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_METADATA_MAX_BYTES = 16 * 1024;
const SAFE_VALUE_MAX_LENGTH = 512;
const RECEIPT_ID_MAX_LENGTH = 128;

function requiredString(value: unknown, code: string, maxLength: number): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function optionalString(value: unknown, code: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  return requiredString(value, code, maxLength);
}

function nonNegativeInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new TypeError(code);
  return Number(value);
}

function safeScalar(value: unknown): SafeScalar | undefined {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, SAFE_VALUE_MAX_LENGTH) : null;
}


const RETENTION_WINDOWS_MS: Readonly<Record<MetaSocialWebhookRetentionClass, Readonly<{ metadata: number; dedupe: number }>>> = Object.freeze({
  STANDARD_WEBHOOK: Object.freeze({ metadata: 30 * 24 * 60 * 60 * 1_000, dedupe: 365 * 24 * 60 * 60 * 1_000 }),
  EXTENDED_FAILURE: Object.freeze({ metadata: 180 * 24 * 60 * 60 * 1_000, dedupe: 730 * 24 * 60 * 60 * 1_000 }),
  REPLAY_AUDIT: Object.freeze({ metadata: 365 * 24 * 60 * 60 * 1_000, dedupe: 730 * 24 * 60 * 60 * 1_000 }),
  SECURITY_REVIEW: Object.freeze({ metadata: 365 * 24 * 60 * 60 * 1_000, dedupe: 730 * 24 * 60 * 60 * 1_000 }),
});

function normalizeOptionalDate(value: Date | null | undefined, code: string): Date | null {
  if (value == null) return null;
  const normalized = new Date(value);
  if (!Number.isFinite(normalized.getTime())) throw new TypeError(code);
  return normalized;
}

export function resolveMetaSocialWebhookRetention(input: {
  readonly receivedAt: Date;
  readonly retentionClass?: MetaSocialWebhookRetentionClass;
}): Readonly<{ retentionClass: MetaSocialWebhookRetentionClass; retentionUntil: Date; dedupeRetainUntil: Date }> {
  const receivedAt = new Date(input.receivedAt);
  if (!Number.isFinite(receivedAt.getTime())) throw new TypeError('META_SOCIAL_WEBHOOK_RECEIVED_AT_INVALID');
  const retentionClass = input.retentionClass ?? 'STANDARD_WEBHOOK';
  if (!META_SOCIAL_WEBHOOK_RETENTION_CLASSES.includes(retentionClass)) throw new TypeError('META_SOCIAL_WEBHOOK_RETENTION_CLASS_INVALID');
  const window = RETENTION_WINDOWS_MS[retentionClass];
  return Object.freeze({
    retentionClass,
    retentionUntil: new Date(receivedAt.getTime() + window.metadata),
    dedupeRetainUntil: new Date(receivedAt.getTime() + window.dedupe),
  });
}

export function resolveMetaSocialWebhookReplayEligibility(input: {
  readonly state: MetaSocialWebhookReceiptState;
  readonly replaySourceType: MetaSocialWebhookReplaySourceType;
  readonly replaySourceId?: string | null;
  readonly replaySourceExpiresAt?: Date | null;
  readonly replayApprovalId?: string | null;
  readonly replayApprovedBy?: string | null;
  readonly replayApprovedAt?: Date | null;
  readonly failureCode?: string | null;
  readonly failureCategory?: string | null;
  readonly now?: Date;
}): MetaSocialWebhookReplayEligibility {
  if (input.state !== 'DEAD_LETTERED') return 'NOT_ELIGIBLE';
  if (/UNKNOWN(?:_|-)OUTCOME/i.test(`${input.failureCode ?? ''} ${input.failureCategory ?? ''}`)) return 'UNKNOWN_OUTCOME_BLOCKED';
  if (input.replaySourceType === 'NONE' || !input.replaySourceId?.trim()) return 'SOURCE_UNAVAILABLE';
  const now = input.now ? new Date(input.now) : new Date();
  if (!Number.isFinite(now.getTime())) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_TIME_INVALID');
  const expiresAt = normalizeOptionalDate(input.replaySourceExpiresAt, 'META_SOCIAL_WEBHOOK_REPLAY_SOURCE_EXPIRY_INVALID');
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return 'SOURCE_EXPIRED';
  const approvalComplete = Boolean(input.replayApprovalId?.trim() && input.replayApprovedBy?.trim() && input.replayApprovedAt);
  return approvalComplete ? 'ELIGIBLE' : 'APPROVAL_REQUIRED';
}

function normalizedSensitiveKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function isMetaSocialWebhookSensitiveKey(value: string): boolean {
  const normalized = normalizedSensitiveKey(value);
  return META_SOCIAL_WEBHOOK_SENSITIVE_KEY_DENYLIST.some((candidate) => normalizedSensitiveKey(candidate) === normalized);
}

export function isMetaSocialWebhookMetadataPrunable(input: {
  readonly state: MetaSocialWebhookReceiptState;
  readonly retentionUntil: Date;
  readonly dedupeRetainUntil: Date;
  readonly metadataPrunedAt?: Date | null;
  readonly now?: Date;
}): boolean {
  if (!['PROCESSED', 'BLOCKED', 'DEAD_LETTERED'].includes(input.state)) return false;
  if (input.metadataPrunedAt) return false;
  const now = input.now ? new Date(input.now) : new Date();
  const retentionUntil = new Date(input.retentionUntil);
  const dedupeRetainUntil = new Date(input.dedupeRetainUntil);
  if (![now, retentionUntil, dedupeRetainUntil].every((value) => Number.isFinite(value.getTime()))) {
    throw new TypeError('META_SOCIAL_WEBHOOK_RETENTION_TIME_INVALID');
  }
  return now.getTime() >= retentionUntil.getTime() && now.getTime() < dedupeRetainUntil.getTime();
}

export type MetaSocialWebhookAdminProjection = Readonly<{
  id: string;
  platform: MetaSocialWebhookPlatform;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  providerEventKey: string;
  state: MetaSocialWebhookReceiptState;
  duplicateCount: number;
  digestMismatchCount: number;
  payloadDigestPrefix: string;
  lastPayloadDigestPrefix: string;
  lastDigestMismatchAt: string | null;
  lastDigestMismatchCode: string | null;
  safeMetadata: MetaSocialWebhookSafeMetadata;
  retentionClass: MetaSocialWebhookRetentionClass;
  retentionUntil: string;
  dedupeRetainUntil: string;
  replayEligibility: MetaSocialWebhookReplayEligibility;
  replayAttempt: number;
  parentReceiptId: string | null;
  replayApprovalReference: string | null;
  replayResultCode: string | null;
  correlationId: string;
}>;

export function projectMetaSocialWebhookReceiptForAdmin(row: MetaSocialWebhookReceiptRow): MetaSocialWebhookAdminProjection {
  return Object.freeze({
    id: row.id,
    platform: row.platform,
    environment: row.environment,
    connectionKey: row.connectionKey,
    providerEventKey: row.providerEventKey,
    state: row.state,
    duplicateCount: row.duplicateCount,
    digestMismatchCount: row.digestMismatchCount,
    payloadDigestPrefix: row.payloadDigest.slice(0, 16),
    lastPayloadDigestPrefix: row.lastPayloadDigest.slice(0, 16),
    lastDigestMismatchAt: row.lastDigestMismatchAt?.toISOString() ?? null,
    lastDigestMismatchCode: row.lastDigestMismatchCode,
    safeMetadata: sanitizeMetaSocialWebhookMetadata(row.safeMetadata),
    retentionClass: row.retentionClass,
    retentionUntil: row.retentionUntil.toISOString(),
    dedupeRetainUntil: row.dedupeRetainUntil.toISOString(),
    replayEligibility: row.replayEligibility,
    replayAttempt: row.replayAttempt,
    parentReceiptId: row.parentReceiptId,
    replayApprovalReference: row.replayApprovalReference,
    replayResultCode: row.replayResultCode,
    correlationId: row.correlationId,
  });
}

export function sanitizeMetaSocialWebhookMetadata(
  input: Readonly<Record<string, unknown>> | undefined,
): MetaSocialWebhookSafeMetadata {
  const safe: Partial<Record<SafeMetadataKey, SafeScalar>> = {};
  if (input) {
    for (const key of META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
      const value = safeScalar(input[key]);
      if (value !== undefined) safe[key] = value;
    }
  }
  if (Buffer.byteLength(JSON.stringify(safe), 'utf8') > SAFE_METADATA_MAX_BYTES) {
    throw new TypeError('META_SOCIAL_WEBHOOK_SAFE_METADATA_TOO_LARGE');
  }
  return Object.freeze({ ...safe });
}

export function resolveMetaPlatformEnvironment(
  env: Readonly<Record<string, string | undefined>> = process.env,
): MetaPlatformEnvironment {
  const explicit = env.META_PLATFORM_ENVIRONMENT?.trim().toUpperCase();
  if (explicit) {
    if (!META_PLATFORM_ENVIRONMENTS.includes(explicit as MetaPlatformEnvironment)) {
      throw new TypeError('META_SOCIAL_WEBHOOK_ENVIRONMENT_INVALID');
    }
    return explicit as MetaPlatformEnvironment;
  }
  if (env.NODE_ENV === 'production') return 'PRODUCTION';
  if (env.NODE_ENV === 'test') return 'DEVELOPMENT';
  return 'DEVELOPMENT';
}

export function resolveMetaSocialConnectionKey(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const connectionKey = (env.META_CONNECTION_NAME ?? 'primary').trim();
  if (!CONNECTION_KEY_PATTERN.test(connectionKey)) {
    throw new TypeError('META_SOCIAL_WEBHOOK_CONNECTION_KEY_INVALID');
  }
  return connectionKey;
}

function normalizeCreateInput(input: CreateMetaSocialWebhookReceiptInput) {
  if (!META_SOCIAL_WEBHOOK_PLATFORMS.includes(input.platform)) {
    throw new TypeError('META_SOCIAL_WEBHOOK_PLATFORM_INVALID');
  }
  if (!META_PLATFORM_ENVIRONMENTS.includes(input.environment)) {
    throw new TypeError('META_SOCIAL_WEBHOOK_ENVIRONMENT_INVALID');
  }
  const connectionKey = requiredString(input.connectionKey, 'META_SOCIAL_WEBHOOK_CONNECTION_KEY_INVALID', 80);
  if (!CONNECTION_KEY_PATTERN.test(connectionKey)) {
    throw new TypeError('META_SOCIAL_WEBHOOK_CONNECTION_KEY_INVALID');
  }
  const providerEventKey = requiredString(input.providerEventKey, 'META_SOCIAL_WEBHOOK_EVENT_KEY_INVALID', 512);
  const providerDeliveryId = optionalString(input.providerDeliveryId, 'META_SOCIAL_WEBHOOK_DELIVERY_ID_INVALID', 512);
  const payloadDigest = requiredString(input.payloadDigest, 'META_SOCIAL_WEBHOOK_DIGEST_INVALID', 64).toLowerCase();
  if (!SHA256_PATTERN.test(payloadDigest)) throw new TypeError('META_SOCIAL_WEBHOOK_DIGEST_INVALID');
  const correlationId = requiredString(input.correlationId, 'META_SOCIAL_WEBHOOK_CORRELATION_INVALID', 160);
  const initialState = input.initialState ?? 'RECEIVED';
  if (!META_SOCIAL_WEBHOOK_RECEIPT_STATES.includes(initialState)) {
    throw new TypeError('META_SOCIAL_WEBHOOK_STATE_INVALID');
  }
  if (!META_SOCIAL_WEBHOOK_RECEIPT_INITIAL_STATES.includes(initialState as 'RECEIVED' | 'BLOCKED')) {
    throw new TypeError('META_SOCIAL_WEBHOOK_INITIAL_STATE_INVALID');
  }
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  if (!Number.isFinite(receivedAt.getTime())) throw new TypeError('META_SOCIAL_WEBHOOK_RECEIVED_AT_INVALID');
  const replayAttempt = nonNegativeInteger(input.replayAttempt ?? 0, 'META_SOCIAL_WEBHOOK_REPLAY_ATTEMPT_INVALID');
  const parentReceiptId = optionalString(input.parentReceiptId, 'META_SOCIAL_WEBHOOK_PARENT_INVALID', RECEIPT_ID_MAX_LENGTH);
  if (replayAttempt > 0 && !parentReceiptId) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_PARENT_REQUIRED');
  const legacyReceiptType = optionalString(input.legacyReceiptType, 'META_SOCIAL_WEBHOOK_LEGACY_TYPE_INVALID', 80);
  const legacyReceiptId = optionalString(input.legacyReceiptId, 'META_SOCIAL_WEBHOOK_LEGACY_ID_INVALID', RECEIPT_ID_MAX_LENGTH);
  if (Boolean(legacyReceiptType) !== Boolean(legacyReceiptId)) {
    throw new TypeError('META_SOCIAL_WEBHOOK_LEGACY_REFERENCE_INCOMPLETE');
  }
  const retention = resolveMetaSocialWebhookRetention({
    receivedAt,
    retentionClass: replayAttempt > 0 ? 'REPLAY_AUDIT' : 'STANDARD_WEBHOOK',
  });
  const replaySourceType = input.replaySourceType ?? (legacyReceiptType ? 'LEGACY_RECEIPT' : 'NONE');
  if (!META_SOCIAL_WEBHOOK_REPLAY_SOURCE_TYPES.includes(replaySourceType)) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_SOURCE_TYPE_INVALID');
  const replaySourceId = optionalString(input.replaySourceId ?? legacyReceiptId, 'META_SOCIAL_WEBHOOK_REPLAY_SOURCE_ID_INVALID', 256);
  if ((replaySourceType === 'NONE') !== (replaySourceId === null)) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_SOURCE_INCOMPLETE');
  const replayEligibility = input.replayEligibility ?? 'NOT_ELIGIBLE';
  if (!META_SOCIAL_WEBHOOK_REPLAY_ELIGIBILITIES.includes(replayEligibility)) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_ELIGIBILITY_INVALID');
  const replayApprovalId = optionalString(input.replayApprovalId, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVAL_ID_INVALID', 128);
  const replayApprovedBy = optionalString(input.replayApprovedBy, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVER_INVALID', 160);
  const replayApprovedAt = normalizeOptionalDate(input.replayApprovedAt, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVED_AT_INVALID');
  const approvalFieldCount = [replayApprovalId, replayApprovedBy, replayApprovedAt].filter(Boolean).length;
  if (approvalFieldCount !== 0 && approvalFieldCount !== 3) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_APPROVAL_INCOMPLETE');
  return Object.freeze({
    platform: input.platform,
    environment: input.environment,
    connectionKey,
    providerDeliveryId,
    providerEventKey,
    payloadDigest,
    safeMetadata: sanitizeMetaSocialWebhookMetadata(input.safeMetadata),
    correlationId,
    initialState,
    receivedAt,
    ...retention,
    parentReceiptId,
    replayAttempt,
    replayReason: optionalString(input.replayReason, 'META_SOCIAL_WEBHOOK_REPLAY_REASON_INVALID', 500),
    replayRequestedBy: optionalString(input.replayRequestedBy, 'META_SOCIAL_WEBHOOK_REPLAY_ACTOR_INVALID', 160),
    replayRequestedAt: normalizeOptionalDate(input.replayRequestedAt, 'META_SOCIAL_WEBHOOK_REPLAY_REQUESTED_AT_INVALID'),
    replayEligibility,
    replaySourceType,
    replaySourceId,
    replaySourceExpiresAt: normalizeOptionalDate(input.replaySourceExpiresAt, 'META_SOCIAL_WEBHOOK_REPLAY_SOURCE_EXPIRY_INVALID'),
    replayApprovalId,
    replayApprovedBy,
    replayApprovedAt,
    replayApprovalReference: optionalString(input.replayApprovalReference, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVAL_REFERENCE_INVALID', 256),
    legacyReceiptType,
    legacyReceiptId,
  });
}

export const META_SOCIAL_WEBHOOK_RECEIPT_SELECT_COLUMNS = `
  "id", "provider", "platform", "environment", "connectionKey", "providerDeliveryId",
  "providerEventKey", "payloadDigest", "lastPayloadDigest", "digestMismatchCount", "lastDigestMismatchAt", "lastDigestMismatchCode", "safeMetadata",
  "retentionClass", "retentionUntil", "dedupeRetainUntil", "metadataPrunedAt",
  "receivedAt", "firstSeenAt", "lastSeenAt", "duplicateCount", "state", "queueName",
  "jobReference", "attemptCount", "lastAttemptAt", "nextRetryAt", "failureCode",
  "failureCategory", "failureSummary", "deadLetteredAt", "leaseToken", "leaseOwner",
  "leaseExpiresAt", "queuedAt", "processingStartedAt", "processedAt", "blockedAt",
  "failedAt", "lastTransitionAt", "lastTransitionCode", "lastTransitionActor", "stateVersion",
  "correlationId", "parentReceiptId", "replayAttempt", "replayReason", "replayRequestedBy",
  "replayRequestedAt", "replayEligibility", "replaySourceType", "replaySourceId", "replaySourceExpiresAt",
  "replayApprovalId", "replayApprovedBy", "replayApprovedAt", "replayApprovalReference",
  "replayCompletedAt", "replayResultCode", "legacyReceiptType", "legacyReceiptId",
  "primaryIdentityReferenceId", "normalizedLeadId", "instagramMessageId", "createdAt", "updatedAt"`;

const INSERT_OR_DUPLICATE_SQL = `
INSERT INTO "MetaSocialWebhookReceipt" (
  "id", "provider", "platform", "environment", "connectionKey", "providerDeliveryId",
  "providerEventKey", "payloadDigest", "lastPayloadDigest", "safeMetadata", "receivedAt",
  "firstSeenAt", "lastSeenAt", "state", "blockedAt", "lastTransitionAt", "lastTransitionCode",
  "lastTransitionActor", "correlationId", "retentionClass", "retentionUntil", "dedupeRetainUntil",
  "parentReceiptId", "replayAttempt", "replayReason", "replayRequestedBy", "replayRequestedAt",
  "replayEligibility", "replaySourceType", "replaySourceId", "replaySourceExpiresAt",
  "replayApprovalId", "replayApprovedBy", "replayApprovedAt", "replayApprovalReference",
  "legacyReceiptType", "legacyReceiptId", "createdAt", "updatedAt"
) VALUES (
  $1, 'META'::"MetaSocialWebhookProvider", $2::"MetaSocialWebhookPlatform",
  $3::"MetaPlatformEnvironment", $4, $5, $6, $7, $7, CAST($8 AS JSONB), $9, $9, $9,
  $10::"MetaSocialWebhookReceiptState",
  CASE WHEN $10::"MetaSocialWebhookReceiptState"='BLOCKED' THEN $9 ELSE NULL END,
  CASE WHEN $10::"MetaSocialWebhookReceiptState"='BLOCKED' THEN $9 ELSE NULL END,
  CASE WHEN $10::"MetaSocialWebhookReceiptState"='BLOCKED' THEN 'PRE_PROCESSING_BLOCKED' ELSE NULL END,
  CASE WHEN $10::"MetaSocialWebhookReceiptState"='BLOCKED' THEN 'webhook-receiver' ELSE NULL END,
  $11, $12::"MetaSocialWebhookRetentionClass", $13, $14, $15, $16, $17, $18, $19,
  $20::"MetaSocialWebhookReplayEligibility", $21::"MetaSocialWebhookReplaySourceType", $22, $23,
  $24, $25, $26, $27, $28, $29, NOW(), NOW()
)
ON CONFLICT ("provider", "platform", "environment", "connectionKey", "providerEventKey")
DO UPDATE SET
  "providerDeliveryId" = COALESCE("MetaSocialWebhookReceipt"."providerDeliveryId", EXCLUDED."providerDeliveryId"),
  "duplicateCount" = "MetaSocialWebhookReceipt"."duplicateCount" + 1,
  "lastSeenAt" = GREATEST("MetaSocialWebhookReceipt"."lastSeenAt", EXCLUDED."lastSeenAt"),
  "lastPayloadDigest" = EXCLUDED."payloadDigest",
  "digestMismatchCount" = "MetaSocialWebhookReceipt"."digestMismatchCount"
    + CASE WHEN "MetaSocialWebhookReceipt"."payloadDigest" <> EXCLUDED."payloadDigest" THEN 1 ELSE 0 END,
  "lastDigestMismatchAt" = CASE WHEN "MetaSocialWebhookReceipt"."payloadDigest" <> EXCLUDED."payloadDigest" THEN EXCLUDED."receivedAt" ELSE "MetaSocialWebhookReceipt"."lastDigestMismatchAt" END,
  "lastDigestMismatchCode" = CASE WHEN "MetaSocialWebhookReceipt"."payloadDigest" <> EXCLUDED."payloadDigest" THEN 'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH' ELSE "MetaSocialWebhookReceipt"."lastDigestMismatchCode" END,
  "updatedAt" = NOW()
RETURNING ${META_SOCIAL_WEBHOOK_RECEIPT_SELECT_COLUMNS}`;

const LINK_LEGACY_SQL = `
UPDATE "MetaSocialWebhookReceipt"
SET "legacyReceiptType" = $2, "legacyReceiptId" = $3,
    "replaySourceType"='LEGACY_RECEIPT'::"MetaSocialWebhookReplaySourceType",
    "replaySourceId"=$3,
    "replayEligibility"=CASE WHEN "state"='DEAD_LETTERED'::"MetaSocialWebhookReceiptState" THEN 'APPROVAL_REQUIRED'::"MetaSocialWebhookReplayEligibility" ELSE "replayEligibility" END,
    "updatedAt" = NOW()
WHERE "id" = $1
  AND (("legacyReceiptType" IS NULL AND "legacyReceiptId" IS NULL)
    OR ("legacyReceiptType" = $2 AND "legacyReceiptId" = $3))
RETURNING ${META_SOCIAL_WEBHOOK_RECEIPT_SELECT_COLUMNS}`;

export function createMetaSocialWebhookReceiptRepository(executor: MetaSocialWebhookReceiptQueryExecutor) {
  return Object.freeze({
    async createOrGet(input: CreateMetaSocialWebhookReceiptInput): Promise<CreateMetaSocialWebhookReceiptResult> {
      const normalized = normalizeCreateInput(input);
      const insertedId = randomUUID();
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(
        INSERT_OR_DUPLICATE_SQL,
        insertedId,
        normalized.platform,
        normalized.environment,
        normalized.connectionKey,
        normalized.providerDeliveryId,
        normalized.providerEventKey,
        normalized.payloadDigest,
        JSON.stringify(normalized.safeMetadata),
        normalized.receivedAt,
        normalized.initialState,
        normalized.correlationId,
        normalized.retentionClass,
        normalized.retentionUntil,
        normalized.dedupeRetainUntil,
        normalized.parentReceiptId,
        normalized.replayAttempt,
        normalized.replayReason,
        normalized.replayRequestedBy,
        normalized.replayRequestedAt,
        normalized.replayEligibility,
        normalized.replaySourceType,
        normalized.replaySourceId,
        normalized.replaySourceExpiresAt,
        normalized.replayApprovalId,
        normalized.replayApprovedBy,
        normalized.replayApprovedAt,
        normalized.replayApprovalReference,
        normalized.legacyReceiptType,
        normalized.legacyReceiptId,
      );
      const receipt = rows[0];
      if (!receipt) throw new Error('META_SOCIAL_WEBHOOK_RECEIPT_WRITE_EMPTY');
      const created = receipt.id === insertedId;
      return Object.freeze({
        receipt: Object.freeze({ ...receipt, safeMetadata: Object.freeze({ ...receipt.safeMetadata }) }),
        created,
        duplicate: !created,
        digestMatches: receipt.payloadDigest === normalized.payloadDigest,
      });
    },

    async linkLegacyReceipt(input: {
      readonly receiptId: string;
      readonly legacyReceiptType: string;
      readonly legacyReceiptId: string;
    }): Promise<MetaSocialWebhookReceiptRow> {
      const receiptId = requiredString(input.receiptId, 'META_SOCIAL_WEBHOOK_RECEIPT_ID_INVALID', RECEIPT_ID_MAX_LENGTH);
      const legacyReceiptType = requiredString(input.legacyReceiptType, 'META_SOCIAL_WEBHOOK_LEGACY_TYPE_INVALID', 80);
      const legacyReceiptId = requiredString(input.legacyReceiptId, 'META_SOCIAL_WEBHOOK_LEGACY_ID_INVALID', RECEIPT_ID_MAX_LENGTH);
      const rows = await executor.query<MetaSocialWebhookReceiptRow>(LINK_LEGACY_SQL, receiptId, legacyReceiptType, legacyReceiptId);
      const receipt = rows[0];
      if (!receipt) throw new Error('META_SOCIAL_WEBHOOK_LEGACY_REFERENCE_CONFLICT');
      return Object.freeze({ ...receipt, safeMetadata: Object.freeze({ ...receipt.safeMetadata }) });
    },
  });
}

function copyRow(row: MetaSocialWebhookReceiptRow): MetaSocialWebhookReceiptRow {
  return Object.freeze({ ...row, safeMetadata: Object.freeze({ ...row.safeMetadata }) });
}


function normalizeDate(value: Date | undefined, code: string): Date {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) throw new TypeError(code);
  return date;
}

function normalizeSafeCode(value: unknown, code: string): string {
  const normalized = requiredString(value, code, 80).toUpperCase();
  if (!/^[A-Z][A-Z0-9_]{2,79}$/.test(normalized)) throw new TypeError(code);
  return normalized;
}

function sanitizeFailureSummary(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const summary = requiredString(value, 'META_SOCIAL_WEBHOOK_FAILURE_SUMMARY_INVALID', 500)
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/EA[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s()-]{7,}\d/g, '[REDACTED_PHONE]');
  return summary.slice(0, 500);
}

function requireCurrentLease(row: MetaSocialWebhookReceiptRow, leaseTokenValue: unknown): void {
  const leaseToken = requiredString(leaseTokenValue, 'META_SOCIAL_WEBHOOK_LEASE_TOKEN_INVALID', 128);
  if (row.state !== 'PROCESSING' || row.leaseToken !== leaseToken) {
    throw new MetaSocialWebhookReceiptLifecycleError(
      'META_SOCIAL_WEBHOOK_LEASE_NOT_OWNED',
      'Processing lease does not belong to this worker.',
      { receiptId: row.id, state: row.state },
    );
  }
}

export class InMemoryMetaSocialWebhookReceiptStore {
  readonly #rows = new Map<string, MetaSocialWebhookReceiptRow>();

  #entryById(receiptId: string): readonly [string, MetaSocialWebhookReceiptRow] {
    const normalized = requiredString(receiptId, 'META_SOCIAL_WEBHOOK_RECEIPT_ID_INVALID', RECEIPT_ID_MAX_LENGTH);
    for (const entry of this.#rows.entries()) {
      if (entry[1].id === normalized) return entry;
    }
    throw new MetaSocialWebhookReceiptLifecycleError(
      'META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND',
      'Meta social webhook receipt was not found.',
      { receiptId: normalized },
    );
  }

  #replace(key: string, row: MetaSocialWebhookReceiptRow): MetaSocialWebhookReceiptRow {
    const frozen = copyRow(row);
    this.#rows.set(key, frozen);
    return copyRow(frozen);
  }

  async createOrGet(input: CreateMetaSocialWebhookReceiptInput): Promise<CreateMetaSocialWebhookReceiptResult> {
    const normalized = normalizeCreateInput(input);
    const key = ['META', normalized.platform, normalized.environment, normalized.connectionKey, normalized.providerEventKey].join(':');
    const existing = this.#rows.get(key);
    if (existing) {
      const digestMatches = existing.payloadDigest === normalized.payloadDigest;
      const updated: MetaSocialWebhookReceiptRow = Object.freeze({
        ...existing,
        providerDeliveryId: existing.providerDeliveryId ?? normalized.providerDeliveryId,
        duplicateCount: existing.duplicateCount + 1,
        lastSeenAt: normalized.receivedAt > existing.lastSeenAt ? normalized.receivedAt : existing.lastSeenAt,
        lastPayloadDigest: normalized.payloadDigest,
        digestMismatchCount: existing.digestMismatchCount + (digestMatches ? 0 : 1),
        lastDigestMismatchAt: digestMatches ? existing.lastDigestMismatchAt : normalized.receivedAt,
        lastDigestMismatchCode: digestMatches ? existing.lastDigestMismatchCode : 'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH',
        updatedAt: normalized.receivedAt,
      });
      this.#rows.set(key, updated);
      return Object.freeze({ receipt: copyRow(updated), created: false, duplicate: true, digestMatches });
    }
    const now = normalized.receivedAt;
    const row: MetaSocialWebhookReceiptRow = Object.freeze({
      id: randomUUID(),
      provider: 'META',
      platform: normalized.platform,
      environment: normalized.environment,
      connectionKey: normalized.connectionKey,
      providerDeliveryId: normalized.providerDeliveryId,
      providerEventKey: normalized.providerEventKey,
      payloadDigest: normalized.payloadDigest,
      lastPayloadDigest: normalized.payloadDigest,
      digestMismatchCount: 0,
      lastDigestMismatchAt: null,
      lastDigestMismatchCode: null,
      safeMetadata: normalized.safeMetadata,
      retentionClass: normalized.retentionClass,
      retentionUntil: normalized.retentionUntil,
      dedupeRetainUntil: normalized.dedupeRetainUntil,
      metadataPrunedAt: null,
      receivedAt: now,
      firstSeenAt: now,
      lastSeenAt: now,
      duplicateCount: 0,
      state: normalized.initialState,
      queueName: null,
      jobReference: null,
      attemptCount: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      failureCode: null,
      failureCategory: null,
      failureSummary: null,
      deadLetteredAt: null,
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      queuedAt: null,
      processingStartedAt: null,
      processedAt: null,
      blockedAt: normalized.initialState === 'BLOCKED' ? now : null,
      failedAt: null,
      lastTransitionAt: normalized.initialState === 'BLOCKED' ? now : null,
      lastTransitionCode: normalized.initialState === 'BLOCKED' ? 'PRE_PROCESSING_BLOCKED' : null,
      lastTransitionActor: normalized.initialState === 'BLOCKED' ? 'webhook-receiver' : null,
      stateVersion: 0,
      correlationId: normalized.correlationId,
      parentReceiptId: normalized.parentReceiptId,
      replayAttempt: normalized.replayAttempt,
      replayReason: normalized.replayReason,
      replayRequestedBy: normalized.replayRequestedBy,
      replayRequestedAt: normalized.replayRequestedAt,
      replayEligibility: normalized.replayEligibility,
      replaySourceType: normalized.replaySourceType,
      replaySourceId: normalized.replaySourceId,
      replaySourceExpiresAt: normalized.replaySourceExpiresAt,
      replayApprovalId: normalized.replayApprovalId,
      replayApprovedBy: normalized.replayApprovedBy,
      replayApprovedAt: normalized.replayApprovedAt,
      replayApprovalReference: normalized.replayApprovalReference,
      replayCompletedAt: null,
      replayResultCode: null,
      legacyReceiptType: normalized.legacyReceiptType,
      legacyReceiptId: normalized.legacyReceiptId,
      primaryIdentityReferenceId: null,
      normalizedLeadId: null,
      instagramMessageId: null,
      createdAt: now,
      updatedAt: now,
    });
    this.#rows.set(key, row);
    return Object.freeze({ receipt: copyRow(row), created: true, duplicate: false, digestMatches: true });
  }

  getById(receiptId: string): MetaSocialWebhookReceiptRow | null {
    try {
      return copyRow(this.#entryById(receiptId)[1]);
    } catch (error) {
      if (error instanceof MetaSocialWebhookReceiptLifecycleError
        && error.code === 'META_SOCIAL_WEBHOOK_RECEIPT_NOT_FOUND') return null;
      throw error;
    }
  }

  findByLegacyReceipt(legacyReceiptType: string, legacyReceiptId: string): MetaSocialWebhookReceiptRow | null {
    const type = requiredString(legacyReceiptType, 'META_SOCIAL_WEBHOOK_LEGACY_TYPE_INVALID', 80);
    const id = requiredString(legacyReceiptId, 'META_SOCIAL_WEBHOOK_LEGACY_ID_INVALID', RECEIPT_ID_MAX_LENGTH);
    const row = [...this.#rows.values()].find((candidate) => (
      candidate.legacyReceiptType === type && candidate.legacyReceiptId === id
    ));
    return row ? copyRow(row) : null;
  }

  markQueued(input: {
    readonly receiptId: string;
    readonly queueName: string;
    readonly jobReference: string;
    readonly actor: string;
    readonly now?: Date;
  }): Readonly<{ receipt: MetaSocialWebhookReceiptRow; idempotent: boolean }> {
    const [key, row] = this.#entryById(input.receiptId);
    const queueName = requiredString(input.queueName, 'META_SOCIAL_WEBHOOK_QUEUE_NAME_INVALID', 160);
    const jobReference = requiredString(input.jobReference, 'META_SOCIAL_WEBHOOK_JOB_REFERENCE_INVALID', 256);
    const actor = normalizeMetaSocialWebhookLifecycleActor(input.actor);
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    if (row.state === 'QUEUED') {
      if (row.queueName !== queueName || row.jobReference !== jobReference) {
        throw new MetaSocialWebhookReceiptLifecycleError(
          'META_SOCIAL_WEBHOOK_QUEUE_REFERENCE_CONFLICT',
          'Receipt is already queued with another queue reference.',
          { receiptId: row.id, state: row.state },
        );
      }
      return Object.freeze({ receipt: copyRow(row), idempotent: true });
    }
    assertMetaSocialWebhookReceiptTransition(row.state, 'QUEUED');
    const updated = this.#replace(key, {
      ...row,
      state: 'QUEUED',
      queueName,
      jobReference,
      queuedAt: row.queuedAt ?? now,
      nextRetryAt: null,
      failureCode: null,
      failureCategory: null,
      failureSummary: null,
      lastTransitionAt: now,
      lastTransitionCode: row.state === 'FAILED' ? 'RETRY_QUEUED' : 'QUEUE_HANDOFF_COMPLETED',
      lastTransitionActor: actor,
      stateVersion: row.stateVersion + 1,
      updatedAt: now,
    });
    return Object.freeze({ receipt: updated, idempotent: false });
  }

  markBlocked(input: {
    readonly receiptId: string;
    readonly reasonCode: string;
    readonly actor: string;
    readonly now?: Date;
  }): MetaSocialWebhookReceiptRow {
    const [key, row] = this.#entryById(input.receiptId);
    assertMetaSocialWebhookReceiptTransition(row.state, 'BLOCKED');
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    const updated = this.#replace(key, {
      ...row,
      state: 'BLOCKED',
      blockedAt: now,
      replayCompletedAt: row.replayAttempt > 0 ? now : row.replayCompletedAt,
      replayResultCode: row.replayAttempt > 0 ? 'BLOCKED' : row.replayResultCode,
      failureCode: normalizeSafeCode(input.reasonCode, 'META_SOCIAL_WEBHOOK_BLOCK_CODE_INVALID'),
      failureCategory: 'POLICY',
      nextRetryAt: null,
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastTransitionAt: now,
      lastTransitionCode: 'PRE_PROCESSING_BLOCKED',
      lastTransitionActor: normalizeMetaSocialWebhookLifecycleActor(input.actor),
      stateVersion: row.stateVersion + 1,
      updatedAt: now,
    });
    return updated;
  }

  claim(input: {
    readonly receiptId: string;
    readonly leaseOwner: string;
    readonly leaseMs?: number;
    readonly now?: Date;
  }): Readonly<{ receipt: MetaSocialWebhookReceiptRow; leaseToken: string; reclaimed: boolean }> {
    const [key, row] = this.#entryById(input.receiptId);
    const window = resolveMetaSocialWebhookLeaseWindow(input);
    const reclaimed = row.state === 'PROCESSING';
    if (reclaimed) {
      if (!row.leaseExpiresAt || row.leaseExpiresAt.getTime() > window.now.getTime()) {
        throw new MetaSocialWebhookReceiptLifecycleError(
          'META_SOCIAL_WEBHOOK_LEASE_ACTIVE',
          'Receipt is already owned by an active processing lease.',
          { receiptId: row.id, state: row.state, retryAt: row.leaseExpiresAt?.toISOString() ?? null },
        );
      }
    } else {
      assertMetaSocialWebhookReceiptTransition(row.state, 'PROCESSING');
    }
    const updated = this.#replace(key, {
      ...row,
      state: 'PROCESSING',
      attemptCount: row.attemptCount + 1,
      lastAttemptAt: window.now,
      processingStartedAt: window.now,
      leaseToken: window.leaseToken,
      leaseOwner: window.leaseOwner,
      leaseExpiresAt: window.leaseExpiresAt,
      failureCode: null,
      failureCategory: null,
      failureSummary: null,
      nextRetryAt: null,
      lastTransitionAt: window.now,
      lastTransitionCode: reclaimed ? 'PROCESSING_RECLAIMED' : 'PROCESSING_CLAIMED',
      lastTransitionActor: window.leaseOwner,
      stateVersion: row.stateVersion + 1,
      updatedAt: window.now,
    });
    return Object.freeze({ receipt: updated, leaseToken: window.leaseToken, reclaimed });
  }

  renewLease(input: {
    readonly receiptId: string;
    readonly leaseToken: string;
    readonly leaseOwner: string;
    readonly leaseMs?: number;
    readonly now?: Date;
  }): MetaSocialWebhookReceiptRow {
    const [key, row] = this.#entryById(input.receiptId);
    const window = resolveMetaSocialWebhookLeaseWindow(input);
    const leaseToken = requiredString(input.leaseToken, 'META_SOCIAL_WEBHOOK_LEASE_TOKEN_INVALID', 128);
    if (row.state !== 'PROCESSING' || row.leaseToken !== leaseToken || row.leaseOwner !== window.leaseOwner) {
      throw new MetaSocialWebhookReceiptLifecycleError(
        'META_SOCIAL_WEBHOOK_LEASE_NOT_OWNED',
        'Processing lease does not belong to this worker.',
        { receiptId: row.id, state: row.state },
      );
    }
    if (!row.leaseExpiresAt || row.leaseExpiresAt.getTime() <= window.now.getTime()) {
      throw new MetaSocialWebhookReceiptLifecycleError(
        'META_SOCIAL_WEBHOOK_LEASE_EXPIRED',
        'Processing lease has expired and cannot be renewed.',
        { receiptId: row.id, state: row.state },
      );
    }
    return this.#replace(key, {
      ...row,
      leaseExpiresAt: window.leaseExpiresAt,
      lastTransitionAt: window.now,
      lastTransitionCode: 'PROCESSING_LEASE_RENEWED',
      lastTransitionActor: window.leaseOwner,
      stateVersion: row.stateVersion + 1,
      updatedAt: window.now,
    });
  }

  markProcessed(input: {
    readonly receiptId: string;
    readonly leaseToken: string;
    readonly actor: string;
    readonly now?: Date;
  }): MetaSocialWebhookReceiptRow {
    const [key, row] = this.#entryById(input.receiptId);
    requireCurrentLease(row, input.leaseToken);
    assertMetaSocialWebhookReceiptTransition(row.state, 'PROCESSED');
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    return this.#replace(key, {
      ...row,
      state: 'PROCESSED',
      processedAt: now,
      replayCompletedAt: row.replayAttempt > 0 ? now : row.replayCompletedAt,
      replayResultCode: row.replayAttempt > 0 ? 'PROCESSED' : row.replayResultCode,
      nextRetryAt: null,
      failureCode: null,
      failureCategory: null,
      failureSummary: null,
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastTransitionAt: now,
      lastTransitionCode: 'PROCESSING_COMPLETED',
      lastTransitionActor: normalizeMetaSocialWebhookLifecycleActor(input.actor),
      stateVersion: row.stateVersion + 1,
      updatedAt: now,
    });
  }

  markFailed(input: {
    readonly receiptId: string;
    readonly leaseToken: string;
    readonly failureCode: string;
    readonly failureCategory: string;
    readonly failureSummary?: string | null;
    readonly nextRetryAt?: Date | null;
    readonly actor: string;
    readonly now?: Date;
  }): MetaSocialWebhookReceiptRow {
    const [key, row] = this.#entryById(input.receiptId);
    requireCurrentLease(row, input.leaseToken);
    assertMetaSocialWebhookReceiptTransition(row.state, 'FAILED');
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    const nextRetryAt = input.nextRetryAt == null ? null : normalizeDate(input.nextRetryAt, 'META_SOCIAL_WEBHOOK_RETRY_TIME_INVALID');
    return this.#replace(key, {
      ...row,
      state: 'FAILED',
      failedAt: now,
      failureCode: normalizeSafeCode(input.failureCode, 'META_SOCIAL_WEBHOOK_FAILURE_CODE_INVALID'),
      failureCategory: normalizeSafeCode(input.failureCategory, 'META_SOCIAL_WEBHOOK_FAILURE_CATEGORY_INVALID'),
      failureSummary: sanitizeFailureSummary(input.failureSummary),
      nextRetryAt,
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastTransitionAt: now,
      lastTransitionCode: 'PROCESSING_FAILED',
      lastTransitionActor: normalizeMetaSocialWebhookLifecycleActor(input.actor),
      stateVersion: row.stateVersion + 1,
      updatedAt: now,
    });
  }

  requeueFailed(input: {
    readonly receiptId: string;
    readonly queueName?: string;
    readonly jobReference?: string;
    readonly actor: string;
    readonly now?: Date;
  }): MetaSocialWebhookReceiptRow {
    const [key, row] = this.#entryById(input.receiptId);
    assertMetaSocialWebhookReceiptTransition(row.state, 'QUEUED');
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    if (row.nextRetryAt && row.nextRetryAt.getTime() > now.getTime()) {
      throw new MetaSocialWebhookReceiptLifecycleError(
        'META_SOCIAL_WEBHOOK_RETRY_NOT_DUE',
        'Receipt retry is not due yet.',
        { receiptId: row.id, state: row.state, retryAt: row.nextRetryAt.toISOString() },
      );
    }
    const queueName = input.queueName === undefined
      ? row.queueName
      : requiredString(input.queueName, 'META_SOCIAL_WEBHOOK_QUEUE_NAME_INVALID', 160);
    const jobReference = input.jobReference === undefined
      ? row.jobReference
      : requiredString(input.jobReference, 'META_SOCIAL_WEBHOOK_JOB_REFERENCE_INVALID', 256);
    if (!queueName || !jobReference) {
      throw new TypeError('META_SOCIAL_WEBHOOK_QUEUE_REFERENCE_REQUIRED');
    }
    return this.#replace(key, {
      ...row,
      state: 'QUEUED',
      queueName,
      jobReference,
      queuedAt: now,
      nextRetryAt: null,
      lastTransitionAt: now,
      lastTransitionCode: 'RETRY_QUEUED',
      lastTransitionActor: normalizeMetaSocialWebhookLifecycleActor(input.actor),
      stateVersion: row.stateVersion + 1,
      updatedAt: now,
    });
  }

  markDeadLettered(input: {
    readonly receiptId: string;
    readonly failureCode: string;
    readonly failureSummary?: string | null;
    readonly actor: string;
    readonly now?: Date;
  }): MetaSocialWebhookReceiptRow {
    const [key, row] = this.#entryById(input.receiptId);
    assertMetaSocialWebhookReceiptTransition(row.state, 'DEAD_LETTERED');
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    return this.#replace(key, {
      ...row,
      state: 'DEAD_LETTERED',
      failureCode: normalizeSafeCode(input.failureCode, 'META_SOCIAL_WEBHOOK_FAILURE_CODE_INVALID'),
      failureCategory: 'DEAD_LETTER',
      failureSummary: sanitizeFailureSummary(input.failureSummary),
      deadLetteredAt: now,
      replayCompletedAt: row.replayAttempt > 0 ? now : row.replayCompletedAt,
      replayResultCode: row.replayAttempt > 0 ? 'DEAD_LETTERED' : row.replayResultCode,
      retentionClass: 'EXTENDED_FAILURE',
      retentionUntil: new Date(now.getTime() + RETENTION_WINDOWS_MS.EXTENDED_FAILURE.metadata),
      dedupeRetainUntil: new Date(Math.max(row.dedupeRetainUntil.getTime(), now.getTime() + RETENTION_WINDOWS_MS.EXTENDED_FAILURE.dedupe)),
      replayEligibility: resolveMetaSocialWebhookReplayEligibility({ ...row, state: 'DEAD_LETTERED', now }),
      nextRetryAt: null,
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastTransitionAt: now,
      lastTransitionCode: 'RETRY_EXHAUSTED',
      lastTransitionActor: normalizeMetaSocialWebhookLifecycleActor(input.actor),
      stateVersion: row.stateVersion + 1,
      updatedAt: now,
    });
  }

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
  }): Promise<Readonly<{ receipt: MetaSocialWebhookReceiptRow; created: boolean }>> {
    const original = this.#entryById(input.originalReceiptId)[1];
    if (original.state !== 'DEAD_LETTERED') {
      throw new MetaSocialWebhookReceiptLifecycleError(
        'META_SOCIAL_WEBHOOK_REPLAY_NOT_ALLOWED',
        'Only a dead-lettered receipt can create a controlled replay.',
        { receiptId: original.id, state: original.state },
      );
    }
    const actor = normalizeMetaSocialWebhookLifecycleActor(input.actor, 'META_SOCIAL_WEBHOOK_REPLAY_ACTOR_INVALID');
    const approvedBy = normalizeMetaSocialWebhookLifecycleActor(input.approvedBy, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVER_INVALID');
    if (actor === approvedBy) throw new TypeError('META_SOCIAL_WEBHOOK_REPLAY_TWO_PERSON_APPROVAL_REQUIRED');
    const approvalId = requiredString(input.approvalId, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVAL_ID_INVALID', 128);
    const approvalReference = requiredString(input.approvalReference, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVAL_REFERENCE_INVALID', 256);
    const approvedAt = normalizeDate(input.approvedAt, 'META_SOCIAL_WEBHOOK_REPLAY_APPROVED_AT_INVALID');
    const eligibility = resolveMetaSocialWebhookReplayEligibility({ ...original, replayApprovalId: approvalId, replayApprovedBy: approvedBy, replayApprovedAt: approvedAt, now: input.now });
    if (eligibility !== 'ELIGIBLE') {
      throw new MetaSocialWebhookReceiptLifecycleError('META_SOCIAL_WEBHOOK_REPLAY_NOT_ALLOWED', `Receipt replay eligibility is ${eligibility}.`, { receiptId: original.id, state: original.state, replayEligibility: eligibility });
    }
    const reason = requiredString(input.reason, 'META_SOCIAL_WEBHOOK_REPLAY_REASON_INVALID', 500);
    const requestKey = requiredString(input.replayRequestKey, 'META_SOCIAL_WEBHOOK_REPLAY_REQUEST_KEY_INVALID', 256);
    const requestDigest = createHash('sha256').update(requestKey).digest('hex');
    const eventKey = `replay:${original.id}:${requestDigest.slice(0, 32)}`;
    const existing = [...this.#rows.values()].find((candidate) => (
      candidate.provider === original.provider
      && candidate.platform === original.platform
      && candidate.environment === original.environment
      && candidate.connectionKey === original.connectionKey
      && candidate.providerEventKey === eventKey
    ));
    if (existing) {
      if (existing.replayApprovalId !== approvalId || existing.replayRequestedBy !== actor || existing.replayReason !== reason) {
        throw new MetaSocialWebhookReceiptLifecycleError(
          'META_SOCIAL_WEBHOOK_REPLAY_REQUEST_CONFLICT',
          'Replay request key is already bound to different immutable approval metadata.',
          { receiptId: existing.id, state: existing.state },
        );
      }
      return Object.freeze({ receipt: copyRow(existing), created: false });
    }
    const nextAttempt = Math.max(
      0,
      ...[...this.#rows.values()]
        .filter((candidate) => candidate.parentReceiptId === original.id)
        .map((candidate) => candidate.replayAttempt),
    ) + 1;
    const now = normalizeDate(input.now, 'META_SOCIAL_WEBHOOK_TRANSITION_TIME_INVALID');
    const created = await this.createOrGet({
      platform: original.platform,
      environment: original.environment,
      connectionKey: original.connectionKey,
      providerDeliveryId: original.providerDeliveryId,
      providerEventKey: eventKey,
      payloadDigest: original.payloadDigest,
      safeMetadata: original.safeMetadata,
      correlationId: `meta-replay:${requestDigest.slice(0, 48)}`,
      receivedAt: now,
      parentReceiptId: original.id,
      replayAttempt: nextAttempt,
      replayReason: reason,
      replayRequestedBy: actor,
      replayRequestedAt: now,
      replayEligibility: 'ELIGIBLE',
      replaySourceType: original.replaySourceType,
      replaySourceId: original.replaySourceId,
      replaySourceExpiresAt: original.replaySourceExpiresAt,
      replayApprovalId: approvalId,
      replayApprovedBy: approvedBy,
      replayApprovedAt: approvedAt,
      replayApprovalReference: approvalReference,
      legacyReceiptType: null,
      legacyReceiptId: null,
    });
    const [key, row] = this.#entryById(created.receipt.id);
    const audited = this.#replace(key, {
      ...row,
      lastTransitionAt: now,
      lastTransitionCode: 'CONTROLLED_REPLAY_CREATED',
      lastTransitionActor: actor,
      retentionClass: 'REPLAY_AUDIT',
      retentionUntil: new Date(now.getTime() + RETENTION_WINDOWS_MS.REPLAY_AUDIT.metadata),
      dedupeRetainUntil: new Date(now.getTime() + RETENTION_WINDOWS_MS.REPLAY_AUDIT.dedupe),
      updatedAt: now,
    });
    return Object.freeze({ receipt: audited, created: true });
  }

  snapshot(): readonly MetaSocialWebhookReceiptRow[] {
    return Object.freeze([...this.#rows.values()].map(copyRow));
  }
}

