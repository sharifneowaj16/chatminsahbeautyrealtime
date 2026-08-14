import {
  META_SOCIAL_JOB_ENVIRONMENTS,
  META_SOCIAL_JOB_PLATFORMS,
  META_SOCIAL_JOB_REFERENCE_CONTRACT,
  META_SOCIAL_JOB_SCHEMA_VERSION,
  META_SOCIAL_JOB_TYPES,
  META_SOCIAL_PAYLOAD_REFERENCE_KINDS,
  META_SOCIAL_PAYLOAD_SCOPE_KEYS,
  META_SOCIAL_RECEIPT_REQUIRED_JOB_TYPES,
  metaSocialJobDedupePrefix,
  type CreateMetaSocialJobEnvelopeInput,
  type MetaSocialJobEnvelope,
  type MetaSocialJobObservability,
  type MetaSocialJobType,
  type MetaSocialPayloadReference,
  type MetaSocialPayloadScopeKey,
} from './social-job-types.ts';

export const META_SOCIAL_JOB_ENVELOPE_MAX_BYTES = 8 * 1024;
export const META_SOCIAL_JOB_MAX_ATTEMPT_NUMBER = 1_000;

export type MetaSocialJobEnvelopeValidationIssue = Readonly<{
  code: string;
  field: string;
  message: string;
}>;

export type MetaSocialJobEnvelopeValidationResult =
  | Readonly<{ valid: true; envelope: MetaSocialJobEnvelope; issues: readonly MetaSocialJobEnvelopeValidationIssue[]; payloadBytes: number }>
  | Readonly<{ valid: false; issues: readonly MetaSocialJobEnvelopeValidationIssue[]; payloadBytes: number }>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const DEDUPE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,255}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;
const OBSERVABILITY_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const URL_PATTERN = /(?:https?:\/\/|www\.|data:|file:)/i;

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion', 'jobType', 'receiptId', 'attemptNumber', 'correlationId',
  'scheduledAt', 'dedupeKey', 'payloadRef', 'observability',
]);
const PAYLOAD_REFERENCE_KEYS = new Set(['kind', 'id', 'providerObjectId', 'digest', 'scope']);
const OBSERVABILITY_KEYS = new Set([
  'component', 'operation', 'platform', 'environment', 'connectionKey', 'traceId', 'parentAuditId',
]);
const FORBIDDEN_KEYS = new Set([
  'token', 'accesstoken', 'pagetoken', 'appsecret', 'clientsecret', 'password',
  'authorization', 'cookie', 'cookies', 'email', 'phone', 'mobile', 'message',
  'messagetext', 'rawmessage', 'comment', 'commenttext', 'rawpayload', 'providerpayload',
  'url', 'sourceurl', 'attachmenturl', 'mediaurl', 'signedurl', 'body', 'text', 'pii',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function payloadBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[-_\s]/g, '');
}

function findForbiddenKey(value: unknown, path = 'envelope'): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (FORBIDDEN_KEYS.has(normalized)) {
      return `${path}.${key}`;
    }
    const found = findForbiddenKey(nested, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function addUnknownKeyIssues(
  issues: MetaSocialJobEnvelopeValidationIssue[],
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  field: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      issues.push({ code: 'SOCIAL_JOB_FIELD_UNKNOWN', field: `${field}.${key}`, message: 'Unknown queue envelope field.' });
    }
  }
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function validIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function validateScope(
  input: unknown,
  issues: MetaSocialJobEnvelopeValidationIssue[],
): Readonly<Partial<Record<MetaSocialPayloadScopeKey, string>>> | undefined {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    issues.push({ code: 'SOCIAL_JOB_PAYLOAD_SCOPE_INVALID', field: 'payloadRef.scope', message: 'Payload scope must be an object.' });
    return undefined;
  }
  const allowed = new Set<string>(META_SOCIAL_PAYLOAD_SCOPE_KEYS);
  addUnknownKeyIssues(issues, input, allowed, 'payloadRef.scope');
  const scope: Partial<Record<MetaSocialPayloadScopeKey, string>> = {};
  for (const key of META_SOCIAL_PAYLOAD_SCOPE_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (!validId(value)) {
      issues.push({ code: 'SOCIAL_JOB_PAYLOAD_SCOPE_ID_INVALID', field: `payloadRef.scope.${key}`, message: 'Payload scope IDs must be bounded opaque identifiers.' });
      continue;
    }
    scope[key] = value;
  }
  return Object.keys(scope).length > 0 ? Object.freeze(scope) : undefined;
}

function validatePayloadReference(
  input: unknown,
  jobType: MetaSocialJobType | undefined,
  issues: MetaSocialJobEnvelopeValidationIssue[],
): MetaSocialPayloadReference | undefined {
  if (!isRecord(input)) {
    issues.push({ code: 'SOCIAL_JOB_PAYLOAD_REFERENCE_REQUIRED', field: 'payloadRef', message: 'A durable payload reference is required.' });
    return undefined;
  }
  addUnknownKeyIssues(issues, input, PAYLOAD_REFERENCE_KEYS, 'payloadRef');
  const kind = typeof input.kind === 'string' && META_SOCIAL_PAYLOAD_REFERENCE_KINDS.includes(input.kind as never)
    ? input.kind as MetaSocialPayloadReference['kind']
    : undefined;
  if (!kind) {
    issues.push({ code: 'SOCIAL_JOB_PAYLOAD_REFERENCE_KIND_INVALID', field: 'payloadRef.kind', message: 'Payload reference kind is invalid.' });
  }
  if (!validId(input.id)) {
    issues.push({ code: 'SOCIAL_JOB_PAYLOAD_REFERENCE_ID_INVALID', field: 'payloadRef.id', message: 'Payload reference ID must be a bounded opaque identifier.' });
  }
  if (input.providerObjectId !== undefined && !validId(input.providerObjectId)) {
    issues.push({ code: 'SOCIAL_JOB_PROVIDER_OBJECT_ID_INVALID', field: 'payloadRef.providerObjectId', message: 'Provider object ID must be a bounded opaque identifier.' });
  }
  if (input.digest !== undefined && (typeof input.digest !== 'string' || !DIGEST_PATTERN.test(input.digest))) {
    issues.push({ code: 'SOCIAL_JOB_PAYLOAD_DIGEST_INVALID', field: 'payloadRef.digest', message: 'Payload digest must be a SHA-256 hex digest.' });
  }
  const scope = validateScope(input.scope, issues);
  if (jobType && kind && !META_SOCIAL_JOB_REFERENCE_CONTRACT[jobType].includes(kind as never)) {
    issues.push({ code: 'SOCIAL_JOB_PAYLOAD_REFERENCE_MISMATCH', field: 'payloadRef.kind', message: 'Payload reference kind is not valid for this job type.' });
  }
  if (jobType === 'PROCESS_META_LEAD' && !validId(input.providerObjectId)) {
    issues.push({ code: 'SOCIAL_JOB_PROVIDER_LEAD_ID_REQUIRED', field: 'payloadRef.providerObjectId', message: 'Lead processing requires the provider Lead ID for legacy worker compatibility.' });
  }
  if (!kind || !validId(input.id)) return undefined;
  return Object.freeze({
    kind,
    id: input.id,
    ...(validId(input.providerObjectId) ? { providerObjectId: input.providerObjectId } : {}),
    ...(typeof input.digest === 'string' && DIGEST_PATTERN.test(input.digest) ? { digest: input.digest.toLowerCase() } : {}),
    ...(scope ? { scope } : {}),
  });
}

function validateObservability(
  input: unknown,
  issues: MetaSocialJobEnvelopeValidationIssue[],
): MetaSocialJobObservability | undefined {
  if (!isRecord(input)) {
    issues.push({ code: 'SOCIAL_JOB_OBSERVABILITY_REQUIRED', field: 'observability', message: 'Observability metadata is required.' });
    return undefined;
  }
  addUnknownKeyIssues(issues, input, OBSERVABILITY_KEYS, 'observability');
  const required = ['component', 'operation'] as const;
  for (const key of required) {
    if (typeof input[key] !== 'string' || !OBSERVABILITY_VALUE_PATTERN.test(input[key])) {
      issues.push({ code: 'SOCIAL_JOB_OBSERVABILITY_VALUE_INVALID', field: `observability.${key}`, message: `${key} must be a bounded safe identifier.` });
    }
  }
  const platform = typeof input.platform === 'string' && META_SOCIAL_JOB_PLATFORMS.includes(input.platform as never)
    ? input.platform as MetaSocialJobObservability['platform']
    : undefined;
  if (!platform) {
    issues.push({ code: 'SOCIAL_JOB_PLATFORM_INVALID', field: 'observability.platform', message: 'Platform is invalid.' });
  }
  if (input.environment !== undefined && !(typeof input.environment === 'string' && META_SOCIAL_JOB_ENVIRONMENTS.includes(input.environment as never))) {
    issues.push({ code: 'SOCIAL_JOB_ENVIRONMENT_INVALID', field: 'observability.environment', message: 'Environment is invalid.' });
  }
  for (const key of ['connectionKey', 'traceId', 'parentAuditId'] as const) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || !OBSERVABILITY_VALUE_PATTERN.test(input[key]))) {
      issues.push({ code: 'SOCIAL_JOB_OBSERVABILITY_VALUE_INVALID', field: `observability.${key}`, message: `${key} must be a bounded safe identifier.` });
    }
  }
  if (!platform || typeof input.component !== 'string' || !OBSERVABILITY_VALUE_PATTERN.test(input.component)
    || typeof input.operation !== 'string' || !OBSERVABILITY_VALUE_PATTERN.test(input.operation)) return undefined;
  return Object.freeze({
    component: input.component,
    operation: input.operation,
    platform,
    ...(typeof input.environment === 'string' && META_SOCIAL_JOB_ENVIRONMENTS.includes(input.environment as never) ? { environment: input.environment as MetaSocialJobObservability['environment'] } : {}),
    ...(typeof input.connectionKey === 'string' && OBSERVABILITY_VALUE_PATTERN.test(input.connectionKey) ? { connectionKey: input.connectionKey } : {}),
    ...(typeof input.traceId === 'string' && OBSERVABILITY_VALUE_PATTERN.test(input.traceId) ? { traceId: input.traceId } : {}),
    ...(typeof input.parentAuditId === 'string' && OBSERVABILITY_VALUE_PATTERN.test(input.parentAuditId) ? { parentAuditId: input.parentAuditId } : {}),
  });
}

export function validateMetaSocialJobEnvelope(input: unknown): MetaSocialJobEnvelopeValidationResult {
  const issues: MetaSocialJobEnvelopeValidationIssue[] = [];
  const bytes = payloadBytes(input);
  if (!isRecord(input)) {
    return Object.freeze({
      valid: false as const,
      issues: Object.freeze([{ code: 'SOCIAL_JOB_ENVELOPE_OBJECT_REQUIRED', field: 'envelope', message: 'Queue envelope must be an object.' }]),
      payloadBytes: bytes,
    });
  }
  addUnknownKeyIssues(issues, input, TOP_LEVEL_KEYS, 'envelope');
  if (bytes > META_SOCIAL_JOB_ENVELOPE_MAX_BYTES) {
    issues.push({ code: 'SOCIAL_JOB_ENVELOPE_TOO_LARGE', field: 'envelope', message: `Queue envelope exceeds ${META_SOCIAL_JOB_ENVELOPE_MAX_BYTES} bytes.` });
  }
  if (input.schemaVersion !== META_SOCIAL_JOB_SCHEMA_VERSION) {
    issues.push({ code: 'SOCIAL_JOB_SCHEMA_VERSION_UNSUPPORTED', field: 'schemaVersion', message: 'schemaVersion must be 1.' });
  }
  const jobType = typeof input.jobType === 'string' && META_SOCIAL_JOB_TYPES.includes(input.jobType as never)
    ? input.jobType as MetaSocialJobType
    : undefined;
  if (!jobType) issues.push({ code: 'SOCIAL_JOB_TYPE_INVALID', field: 'jobType', message: 'Social job type is invalid.' });
  const receiptId = input.receiptId === null ? null : validId(input.receiptId) ? input.receiptId : undefined;
  if (input.receiptId !== null && receiptId === undefined) {
    issues.push({ code: 'SOCIAL_JOB_RECEIPT_ID_INVALID', field: 'receiptId', message: 'receiptId must be null or a bounded opaque identifier.' });
  }
  if (jobType && META_SOCIAL_RECEIPT_REQUIRED_JOB_TYPES.includes(jobType as never) && !receiptId) {
    issues.push({ code: 'SOCIAL_JOB_RECEIPT_ID_REQUIRED', field: 'receiptId', message: 'This job type requires a durable webhook receipt ID.' });
  }
  if (!Number.isSafeInteger(input.attemptNumber) || Number(input.attemptNumber) < 1 || Number(input.attemptNumber) > META_SOCIAL_JOB_MAX_ATTEMPT_NUMBER) {
    issues.push({ code: 'SOCIAL_JOB_ATTEMPT_NUMBER_INVALID', field: 'attemptNumber', message: `attemptNumber must be an integer from 1 to ${META_SOCIAL_JOB_MAX_ATTEMPT_NUMBER}.` });
  }
  if (typeof input.correlationId !== 'string' || !CORRELATION_ID_PATTERN.test(input.correlationId)) {
    issues.push({ code: 'SOCIAL_JOB_CORRELATION_ID_INVALID', field: 'correlationId', message: 'correlationId has an invalid format.' });
  }
  if (!validIsoDate(input.scheduledAt)) {
    issues.push({ code: 'SOCIAL_JOB_SCHEDULED_AT_INVALID', field: 'scheduledAt', message: 'scheduledAt must be an ISO datetime.' });
  }
  if (typeof input.dedupeKey !== 'string' || !DEDUPE_KEY_PATTERN.test(input.dedupeKey)) {
    issues.push({ code: 'SOCIAL_JOB_DEDUPE_KEY_INVALID', field: 'dedupeKey', message: 'dedupeKey has an invalid format.' });
  } else if (jobType && !input.dedupeKey.startsWith(metaSocialJobDedupePrefix(jobType))) {
    issues.push({ code: 'SOCIAL_JOB_DEDUPE_NAMESPACE_INVALID', field: 'dedupeKey', message: 'dedupeKey must be namespaced by canonical job type.' });
  }
  const forbiddenKey = findForbiddenKey(input);
  if (forbiddenKey) {
    issues.push({ code: 'SOCIAL_JOB_SECRET_OR_PII_FIELD_FORBIDDEN', field: forbiddenKey, message: 'Secrets, raw payloads, message text, PII and URLs are forbidden in queue envelopes.' });
  }
  const serialized = JSON.stringify(input);
  if (URL_PATTERN.test(serialized)) {
    issues.push({ code: 'SOCIAL_JOB_URL_VALUE_FORBIDDEN', field: 'envelope', message: 'URLs are forbidden in queue envelopes; use a durable stored reference.' });
  }
  const payloadRef = validatePayloadReference(input.payloadRef, jobType, issues);
  const observability = validateObservability(input.observability, issues);
  if (jobType && receiptId && payloadRef?.kind === 'WEBHOOK_RECEIPT' && payloadRef.id !== receiptId) {
    issues.push({ code: 'SOCIAL_JOB_RECEIPT_REFERENCE_MISMATCH', field: 'payloadRef.id', message: 'Webhook receipt reference must match receiptId.' });
  }

  if (issues.length > 0 || !jobType || receiptId === undefined || !payloadRef || !observability
    || typeof input.correlationId !== 'string' || !CORRELATION_ID_PATTERN.test(input.correlationId)
    || !validIsoDate(input.scheduledAt) || typeof input.dedupeKey !== 'string'
    || !Number.isSafeInteger(input.attemptNumber)) {
    return Object.freeze({ valid: false as const, issues: Object.freeze(issues), payloadBytes: bytes });
  }
  const envelope: MetaSocialJobEnvelope = Object.freeze({
    schemaVersion: META_SOCIAL_JOB_SCHEMA_VERSION,
    jobType,
    receiptId,
    attemptNumber: Number(input.attemptNumber),
    correlationId: input.correlationId,
    scheduledAt: new Date(input.scheduledAt).toISOString(),
    dedupeKey: input.dedupeKey,
    payloadRef,
    observability,
  });
  return Object.freeze({ valid: true as const, envelope, issues: Object.freeze([]), payloadBytes: bytes });
}

export class MetaSocialJobEnvelopeError extends TypeError {
  readonly code = 'META_SOCIAL_JOB_ENVELOPE_INVALID';
  readonly issues: readonly MetaSocialJobEnvelopeValidationIssue[];

  constructor(issues: readonly MetaSocialJobEnvelopeValidationIssue[]) {
    super('Meta social queue envelope is invalid.');
    this.name = 'MetaSocialJobEnvelopeError';
    this.issues = Object.freeze([...issues]);
  }
}

export function createMetaSocialJobEnvelope(input: CreateMetaSocialJobEnvelopeInput): MetaSocialJobEnvelope {
  const scheduledAt = input.scheduledAt instanceof Date
    ? input.scheduledAt.toISOString()
    : input.scheduledAt ?? new Date().toISOString();
  const candidate = {
    schemaVersion: META_SOCIAL_JOB_SCHEMA_VERSION,
    jobType: input.jobType,
    receiptId: input.receiptId ?? null,
    attemptNumber: input.attemptNumber ?? 1,
    correlationId: input.correlationId,
    scheduledAt,
    dedupeKey: input.dedupeKey,
    payloadRef: input.payloadRef,
    observability: input.observability,
  };
  const validation = validateMetaSocialJobEnvelope(candidate);
  if (!validation.valid) throw new MetaSocialJobEnvelopeError(validation.issues);
  return validation.envelope;
}

export function isMetaSocialJobEnvelope(input: unknown): input is MetaSocialJobEnvelope {
  return validateMetaSocialJobEnvelope(input).valid;
}
