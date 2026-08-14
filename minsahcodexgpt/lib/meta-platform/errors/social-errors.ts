import {
  createMetaPlatformError,
  isMetaPlatformError,
  type MetaErrorCategory,
  type MetaPlatformError,
} from '../core/errors';

export const META_SOCIAL_ERROR_DOMAINS = [
  'WEBHOOK',
  'LEADS',
  'INSTAGRAM',
  'FACEBOOK_PAGE',
  'REALTIME',
] as const;

export const META_SOCIAL_REQUEST_KINDS = ['READ', 'WRITE', 'WEBHOOK'] as const;

export const META_SOCIAL_PROVIDER_ERROR_KINDS = [
  'INVALID_REQUEST',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'RESOURCE_NOT_FOUND',
  'CONFLICT',
  'RATE_LIMIT',
  'PROVIDER_UNAVAILABLE',
  'TIMEOUT',
  'CONFIGURATION',
  'REPLY_WINDOW_EXPIRED',
  'ATTACHMENT_REJECTED',
  'UNKNOWN_OUTCOME',
  'INTERNAL',
] as const;

export const META_SOCIAL_ERROR_DISPOSITIONS = [
  'BLOCKED',
  'RETRYABLE_FAILURE',
  'PERMANENT_FAILURE',
  'RECONCILIATION_REQUIRED',
] as const;

export type MetaSocialErrorDomain = (typeof META_SOCIAL_ERROR_DOMAINS)[number];
export type MetaSocialRequestKind = (typeof META_SOCIAL_REQUEST_KINDS)[number];
export type MetaSocialProviderErrorKind = (typeof META_SOCIAL_PROVIDER_ERROR_KINDS)[number];
export type MetaSocialErrorDisposition = (typeof META_SOCIAL_ERROR_DISPOSITIONS)[number];

export interface MetaSocialProviderError extends MetaPlatformError {
  readonly provider: 'META';
  readonly domain: MetaSocialErrorDomain;
  readonly operation: string;
  readonly requestKind: MetaSocialRequestKind;
  readonly kind: MetaSocialProviderErrorKind;
  readonly disposition: MetaSocialErrorDisposition;
  readonly requestMayHaveSucceeded: boolean;
}

export interface CreateMetaSocialProviderErrorInput {
  readonly domain: MetaSocialErrorDomain;
  readonly operation: string;
  readonly requestKind: MetaSocialRequestKind;
  readonly kind: MetaSocialProviderErrorKind;
  readonly correlationId?: string;
  readonly requestMayHaveSucceeded?: boolean;
  readonly sourceCode?: string;
  readonly httpStatus?: number;
  readonly providerCode?: string | number;
  readonly providerSubcode?: string | number;
  readonly providerType?: string;
  readonly traceId?: string;
  readonly retryAfterMs?: number;
}

export interface NormalizeMetaSocialProviderErrorInput {
  readonly error: unknown;
  readonly domain: MetaSocialErrorDomain;
  readonly operation: string;
  readonly requestKind: MetaSocialRequestKind;
  readonly correlationId?: string;
  readonly requestMayHaveSucceeded?: boolean;
  readonly fallbackKind?: MetaSocialProviderErrorKind;
  readonly headers?: Headers | Readonly<Record<string, string | undefined>>;
}

type ProviderErrorPayload = {
  readonly error?: {
    readonly message?: unknown;
    readonly type?: unknown;
    readonly code?: unknown;
    readonly error_subcode?: unknown;
    readonly is_transient?: unknown;
    readonly fbtrace_id?: unknown;
  };
};

type ErrorSignals = {
  readonly sourceCode?: string;
  readonly message?: string;
  readonly httpStatus?: number;
  readonly providerCode?: string | number;
  readonly providerSubcode?: string | number;
  readonly providerType?: string;
  readonly traceId?: string;
  readonly retryAfterMs?: number;
  readonly isTransient?: boolean;
  readonly category?: MetaErrorCategory;
  readonly retryable?: boolean;
};

type ErrorDefinition = {
  readonly code: string;
  readonly category: MetaErrorCategory;
  readonly message: string;
  readonly retryable: boolean;
  readonly disposition: MetaSocialErrorDisposition;
};

const OPERATION_PATTERN = /^[A-Z][A-Z0-9_.:-]{2,79}$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1_000;

const KIND_DEFINITIONS: Readonly<Record<MetaSocialProviderErrorKind, ErrorDefinition>> = Object.freeze({
  INVALID_REQUEST: Object.freeze({
    code: 'META_SOCIAL_REQUEST_INVALID',
    category: 'VALIDATION',
    message: 'Meta rejected the social operation request. Correct the request before retrying.',
    retryable: false,
    disposition: 'PERMANENT_FAILURE',
  }),
  AUTHENTICATION: Object.freeze({
    code: 'META_SOCIAL_AUTHENTICATION_FAILED',
    category: 'AUTHENTICATION',
    message: 'Meta authentication failed. Refresh or replace the configured credential.',
    retryable: false,
    disposition: 'BLOCKED',
  }),
  AUTHORIZATION: Object.freeze({
    code: 'META_SOCIAL_AUTHORIZATION_FAILED',
    category: 'AUTHORIZATION',
    message: 'Meta denied the social operation. Verify asset ownership and required permissions.',
    retryable: false,
    disposition: 'BLOCKED',
  }),
  RESOURCE_NOT_FOUND: Object.freeze({
    code: 'META_SOCIAL_RESOURCE_NOT_FOUND',
    category: 'NOT_FOUND',
    message: 'The requested Meta social resource was not found or is no longer accessible.',
    retryable: false,
    disposition: 'PERMANENT_FAILURE',
  }),
  CONFLICT: Object.freeze({
    code: 'META_SOCIAL_CONFLICT',
    category: 'CONFLICT',
    message: 'Meta reported a conflicting social resource state.',
    retryable: false,
    disposition: 'PERMANENT_FAILURE',
  }),
  RATE_LIMIT: Object.freeze({
    code: 'META_SOCIAL_RATE_LIMITED',
    category: 'RATE_LIMIT',
    message: 'Meta temporarily rate-limited the social operation.',
    retryable: true,
    disposition: 'RETRYABLE_FAILURE',
  }),
  PROVIDER_UNAVAILABLE: Object.freeze({
    code: 'META_SOCIAL_PROVIDER_UNAVAILABLE',
    category: 'DEPENDENCY_UNAVAILABLE',
    message: 'Meta is temporarily unavailable for this social operation.',
    retryable: true,
    disposition: 'RETRYABLE_FAILURE',
  }),
  TIMEOUT: Object.freeze({
    code: 'META_SOCIAL_PROVIDER_TIMEOUT',
    category: 'TIMEOUT',
    message: 'The Meta social provider request timed out.',
    retryable: true,
    disposition: 'RETRYABLE_FAILURE',
  }),
  CONFIGURATION: Object.freeze({
    code: 'META_SOCIAL_CONFIGURATION_INVALID',
    category: 'CONFIGURATION',
    message: 'The Meta social integration is not configured correctly.',
    retryable: false,
    disposition: 'BLOCKED',
  }),
  REPLY_WINDOW_EXPIRED: Object.freeze({
    code: 'META_SOCIAL_REPLY_WINDOW_EXPIRED',
    category: 'CONFLICT',
    message: 'The reply is outside the allowed Meta messaging window.',
    retryable: false,
    disposition: 'BLOCKED',
  }),
  ATTACHMENT_REJECTED: Object.freeze({
    code: 'META_SOCIAL_ATTACHMENT_REJECTED',
    category: 'VALIDATION',
    message: 'The social attachment does not meet the allowed media policy.',
    retryable: false,
    disposition: 'BLOCKED',
  }),
  UNKNOWN_OUTCOME: Object.freeze({
    code: 'META_SOCIAL_UNKNOWN_OUTCOME',
    category: 'RECONCILIATION_REQUIRED',
    message: 'Meta may have accepted the write. Verify provider state before any retry.',
    retryable: false,
    disposition: 'RECONCILIATION_REQUIRED',
  }),
  INTERNAL: Object.freeze({
    code: 'META_SOCIAL_OPERATION_FAILED',
    category: 'INTERNAL',
    message: 'The Meta social operation failed.',
    retryable: false,
    disposition: 'PERMANENT_FAILURE',
  }),
});

const INVALID_REQUEST_PROVIDER_CODES = new Set(['100']);
const AUTHENTICATION_PROVIDER_CODES = new Set(['190']);
const AUTHORIZATION_PROVIDER_CODES = new Set(['10', '200', '299']);
const RATE_LIMIT_PROVIDER_CODES = new Set(['4', '17', '32', '613']);
const NOT_FOUND_PROVIDER_CODES = new Set(['803']);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOperation(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!OPERATION_PATTERN.test(normalized)) throw new TypeError('META_SOCIAL_ERROR_OPERATION_INVALID');
  return normalized;
}

function safeCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function safeProviderCode(value: unknown): string | number | undefined {
  const number = finiteNumber(value);
  if (number !== undefined && Number.isSafeInteger(number)) return number;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return SAFE_IDENTIFIER_PATTERN.test(normalized) ? normalized : undefined;
}

function safeIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return SAFE_IDENTIFIER_PATTERN.test(normalized) ? normalized : undefined;
}

function safeProviderType(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 100 || !/^[A-Za-z0-9 ._:-]+$/.test(normalized)) return undefined;
  return normalized;
}

function boundedHttpStatus(value: unknown): number | undefined {
  const status = finiteNumber(value);
  return status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function boundedRetryAfterMs(value: unknown): number | undefined {
  const retryAfterMs = finiteNumber(value);
  if (retryAfterMs === undefined || retryAfterMs < 0) return undefined;
  return Math.min(Math.round(retryAfterMs), MAX_RETRY_AFTER_MS);
}

const SOCIAL_ERROR_KEYS = new Set([
  'code',
  'category',
  'message',
  'retryable',
  'safeDetails',
  'correlationId',
  'provider',
  'domain',
  'operation',
  'requestKind',
  'kind',
  'disposition',
  'requestMayHaveSucceeded',
]);

const SAFE_DETAIL_KEYS = new Set([
  'domain',
  'operation',
  'requestKind',
  'disposition',
  'requestMayHaveSucceeded',
  'sourceCode',
  'httpStatus',
  'providerCode',
  'providerSubcode',
  'providerType',
  'traceId',
  'retryAfterMs',
]);

function hasCanonicalSafeDetails(value: MetaPlatformError & Readonly<Record<string, unknown>>): boolean {
  const details = value.safeDetails;
  if (!isRecord(details) || Object.keys(details).some((key) => !SAFE_DETAIL_KEYS.has(key))) return false;
  if (details.domain !== value.domain
    || details.operation !== value.operation
    || details.requestKind !== value.requestKind
    || details.disposition !== value.disposition
    || details.requestMayHaveSucceeded !== value.requestMayHaveSucceeded) return false;
  if (details.sourceCode !== undefined && safeCode(details.sourceCode) !== details.sourceCode) return false;
  if (details.httpStatus !== undefined && boundedHttpStatus(details.httpStatus) !== details.httpStatus) return false;
  if (details.providerCode !== undefined && safeProviderCode(details.providerCode) !== details.providerCode) return false;
  if (details.providerSubcode !== undefined && safeProviderCode(details.providerSubcode) !== details.providerSubcode) return false;
  if (details.providerType !== undefined && safeProviderType(details.providerType) !== details.providerType) return false;
  if (details.traceId !== undefined && safeIdentifier(details.traceId) !== details.traceId) return false;
  if (details.retryAfterMs !== undefined && boundedRetryAfterMs(details.retryAfterMs) !== details.retryAfterMs) return false;
  return true;
}

function readHeader(
  headers: NormalizeMetaSocialProviderErrorInput['headers'],
  name: string,
): string | undefined {
  if (!headers) return undefined;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target && typeof value === 'string') return value;
  }
  return undefined;
}

function parseRetryAfterMs(headers: NormalizeMetaSocialProviderErrorInput['headers']): number | undefined {
  const raw = readHeader(headers, 'retry-after')?.trim();
  if (!raw) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(raw)) return boundedRetryAfterMs(Number(raw) * 1_000);
  const at = new Date(raw).getTime();
  if (Number.isNaN(at)) return undefined;
  return boundedRetryAfterMs(Math.max(0, at - Date.now()));
}

function extractProviderPayload(value: unknown): ProviderErrorPayload['error'] | undefined {
  if (!isRecord(value)) return undefined;
  if (isRecord(value.error)) return value.error as ProviderErrorPayload['error'];
  if (isRecord(value.payload) && isRecord(value.payload.error)) {
    return value.payload.error as ProviderErrorPayload['error'];
  }
  if (isRecord(value.response) && isRecord(value.response.data) && isRecord(value.response.data.error)) {
    return value.response.data.error as ProviderErrorPayload['error'];
  }
  return undefined;
}

function extractSignals(input: NormalizeMetaSocialProviderErrorInput): ErrorSignals {
  const value = input.error;
  const record = isRecord(value) ? value : undefined;
  const provider = extractProviderPayload(value);
  const platform = isMetaPlatformError(value) ? value : undefined;
  const safeDetails = platform?.safeDetails;
  const cause = record && isRecord(record.cause) ? record.cause : undefined;
  const safeProvider = record && isRecord(record.safeProvider) ? record.safeProvider : undefined;
  const message = value instanceof Error
    ? value.message
    : typeof record?.message === 'string'
      ? record.message
      : typeof provider?.message === 'string'
        ? provider.message
        : undefined;
  const status = boundedHttpStatus(
    record?.httpStatus
      ?? record?.status
      ?? (isRecord(record?.response) ? record.response.status : undefined)
      ?? safeProvider?.httpStatus
      ?? safeProvider?.status
      ?? safeDetails?.httpStatus,
  );
  const sourceCode = safeCode(platform?.code ?? record?.code ?? safeProvider?.code ?? cause?.code);
  const providerCode = safeProviderCode(provider?.code ?? safeProvider?.providerCode ?? safeDetails?.providerCode);
  const providerSubcode = safeProviderCode(provider?.error_subcode ?? record?.subcode ?? safeProvider?.subcode ?? safeProvider?.providerSubcode ?? safeDetails?.providerSubcode);
  const traceId = safeIdentifier(provider?.fbtrace_id ?? record?.traceId ?? safeProvider?.traceId ?? safeDetails?.traceId);
  const retryAfterMs = boundedRetryAfterMs(safeDetails?.retryAfterMs) ?? parseRetryAfterMs(input.headers);
  return Object.freeze({
    ...(sourceCode ? { sourceCode } : {}),
    ...(message ? { message } : {}),
    ...(status !== undefined ? { httpStatus: status } : {}),
    ...(providerCode !== undefined ? { providerCode } : {}),
    ...(providerSubcode !== undefined ? { providerSubcode } : {}),
    ...(safeProviderType(provider?.type ?? safeDetails?.providerType) ? { providerType: safeProviderType(provider?.type ?? safeDetails?.providerType) } : {}),
    ...(traceId ? { traceId } : {}),
    ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    ...(provider?.is_transient === true ? { isTransient: true } : {}),
    ...(platform ? { category: platform.category, retryable: platform.retryable } : {}),
  });
}

function includesAny(value: string, fragments: readonly string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment));
}

function classifyPolicyOrLegacyError(signals: ErrorSignals): MetaSocialProviderErrorKind | undefined {
  const text = `${signals.sourceCode ?? ''} ${signals.message ?? ''}`.toUpperCase();
  if (includesAny(text, [
    'WINDOW_EXPIRED',
    'REPLY_WINDOW_EXPIRED',
    'PRIVATE_REPLY_WINDOW_EXPIRED',
    'PRIVATE_REPLY_ALREADY_SENT',
    'INSTAGRAM_REPLY_BLOCKED:WINDOW',
  ])) return 'REPLY_WINDOW_EXPIRED';
  if (includesAny(text, [
    'ATTACHMENT_REJECTED',
    'ATTACHMENT_INVALID',
    'ATTACHMENT_SIZE',
    'ATTACHMENT_MIME',
    'MEDIA_REJECTED',
    'MEDIA_INVALID',
    'MEDIA_MALWARE',
    'MALICIOUS_MEDIA',
    'UNSAFE_MEDIA',
  ])) return 'ATTACHMENT_REJECTED';
  if (includesAny(text, [
    'ACCESS_TOKEN_REQUIRED',
    'TOKEN_ERROR',
    'TOKEN_INVALID',
    'TOKEN_EXPIRED',
    'AUTHENTICATION',
  ])) return 'AUTHENTICATION';
  if (includesAny(text, [
    'PERMISSION_MISSING',
    'PERMISSION_DENIED',
    'AUTHORIZATION',
    'ACCOUNT_MISMATCH',
    'OWNERSHIP_MISMATCH',
  ])) return 'AUTHORIZATION';
  if (includesAny(text, [
    'NOT_FOUND',
    'UNAVAILABLE_DELETED_EXPIRED',
  ])) return 'RESOURCE_NOT_FOUND';
  if (includesAny(text, [
    'RATE_LIMIT',
    'TOO_MANY_REQUESTS',
  ])) return 'RATE_LIMIT';
  if (includesAny(text, [
    'TIMEOUT',
    'ETIMEDOUT',
    'ABORTERROR',
  ])) return 'TIMEOUT';
  if (includesAny(text, [
    'CONFIG_REQUIRED',
    'CONFIGURATION',
    'APP_SECRET_REQUIRED',
  ])) return 'CONFIGURATION';
  if (includesAny(text, [
    'NETWORK_ERROR',
    'GRAPH_RETRYABLE',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'ENOTFOUND',
    'FETCH_FAILED',
    'MEDIA_DOWNLOAD_FAILED',
  ])) return 'PROVIDER_UNAVAILABLE';
  return undefined;
}

function classifyKind(signals: ErrorSignals, fallback: MetaSocialProviderErrorKind): MetaSocialProviderErrorKind {
  const policyOrLegacy = classifyPolicyOrLegacyError(signals);
  if (policyOrLegacy) return policyOrLegacy;

  const providerCode = signals.providerCode === undefined ? undefined : String(signals.providerCode);
  if (providerCode && INVALID_REQUEST_PROVIDER_CODES.has(providerCode)) return 'INVALID_REQUEST';
  if (providerCode && AUTHENTICATION_PROVIDER_CODES.has(providerCode)) return 'AUTHENTICATION';
  if (providerCode && AUTHORIZATION_PROVIDER_CODES.has(providerCode)) return 'AUTHORIZATION';
  if (providerCode && RATE_LIMIT_PROVIDER_CODES.has(providerCode)) return 'RATE_LIMIT';
  if (providerCode && NOT_FOUND_PROVIDER_CODES.has(providerCode)) return 'RESOURCE_NOT_FOUND';

  if (signals.httpStatus === 400 || signals.httpStatus === 422) return 'INVALID_REQUEST';
  if (signals.httpStatus === 401) return 'AUTHENTICATION';
  if (signals.httpStatus === 403) return 'AUTHORIZATION';
  if (signals.httpStatus === 404) return 'RESOURCE_NOT_FOUND';
  if (signals.httpStatus === 408 || signals.httpStatus === 504) return 'TIMEOUT';
  if (signals.httpStatus === 409) return 'CONFLICT';
  if (signals.httpStatus === 429) return 'RATE_LIMIT';
  if (signals.httpStatus !== undefined && signals.httpStatus >= 500) return 'PROVIDER_UNAVAILABLE';

  if (signals.category === 'AUTHENTICATION') return 'AUTHENTICATION';
  if (signals.category === 'AUTHORIZATION') return 'AUTHORIZATION';
  if (signals.category === 'NOT_FOUND') return 'RESOURCE_NOT_FOUND';
  if (signals.category === 'CONFLICT') return 'CONFLICT';
  if (signals.category === 'RATE_LIMIT') return 'RATE_LIMIT';
  if (signals.category === 'DEPENDENCY_UNAVAILABLE') return 'PROVIDER_UNAVAILABLE';
  if (signals.category === 'TIMEOUT') return 'TIMEOUT';
  if (signals.category === 'CONFIGURATION') return 'CONFIGURATION';
  if (signals.category === 'VALIDATION') return 'INVALID_REQUEST';
  if (signals.category === 'RECONCILIATION_REQUIRED') return 'UNKNOWN_OUTCOME';
  if (signals.isTransient || signals.retryable) return 'PROVIDER_UNAVAILABLE';
  return fallback;
}

function withUnknownWriteOutcome(
  kind: MetaSocialProviderErrorKind,
  requestKind: MetaSocialRequestKind,
  requestMayHaveSucceeded: boolean,
): MetaSocialProviderErrorKind {
  if (!requestMayHaveSucceeded || requestKind !== 'WRITE') return kind;
  return kind === 'TIMEOUT' || kind === 'PROVIDER_UNAVAILABLE' || kind === 'INTERNAL'
    ? 'UNKNOWN_OUTCOME'
    : kind;
}

export function createMetaSocialProviderError(
  input: CreateMetaSocialProviderErrorInput,
): MetaSocialProviderError {
  if (!META_SOCIAL_ERROR_DOMAINS.includes(input.domain)) throw new TypeError('META_SOCIAL_ERROR_DOMAIN_INVALID');
  if (!META_SOCIAL_REQUEST_KINDS.includes(input.requestKind)) throw new TypeError('META_SOCIAL_ERROR_REQUEST_KIND_INVALID');
  if (!META_SOCIAL_PROVIDER_ERROR_KINDS.includes(input.kind)) throw new TypeError('META_SOCIAL_ERROR_KIND_INVALID');
  const operation = normalizeOperation(input.operation);
  const requestMayHaveSucceeded = input.requestMayHaveSucceeded === true;
  const kind = withUnknownWriteOutcome(input.kind, input.requestKind, requestMayHaveSucceeded);
  const definition = KIND_DEFINITIONS[kind];
  const sourceCode = safeCode(input.sourceCode);
  const httpStatus = boundedHttpStatus(input.httpStatus);
  const providerCode = safeProviderCode(input.providerCode);
  const providerSubcode = safeProviderCode(input.providerSubcode);
  const providerType = safeProviderType(input.providerType);
  const traceId = safeIdentifier(input.traceId);
  const retryAfterMs = boundedRetryAfterMs(input.retryAfterMs);
  const base = createMetaPlatformError({
    code: definition.code,
    category: definition.category,
    message: definition.message,
    retryable: definition.retryable,
    safeDetails: {
      domain: input.domain,
      operation,
      requestKind: input.requestKind,
      disposition: definition.disposition,
      requestMayHaveSucceeded,
      ...(sourceCode ? { sourceCode } : {}),
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      ...(providerCode !== undefined ? { providerCode } : {}),
      ...(providerSubcode !== undefined ? { providerSubcode } : {}),
      ...(providerType ? { providerType } : {}),
      ...(traceId ? { traceId } : {}),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    },
    correlationId: input.correlationId,
  });

  return Object.freeze({
    ...base,
    provider: 'META' as const,
    domain: input.domain,
    operation,
    requestKind: input.requestKind,
    kind,
    disposition: definition.disposition,
    requestMayHaveSucceeded,
  });
}

export function normalizeMetaSocialProviderError(
  input: NormalizeMetaSocialProviderErrorInput,
): MetaSocialProviderError {
  if (isMetaSocialProviderError(input.error)) {
    if (input.correlationId && !input.error.correlationId) {
      return createMetaSocialProviderError({
        domain: input.error.domain,
        operation: input.error.operation,
        requestKind: input.error.requestKind,
        kind: input.error.kind,
        requestMayHaveSucceeded: input.error.requestMayHaveSucceeded,
        sourceCode: typeof input.error.safeDetails?.sourceCode === 'string' ? input.error.safeDetails.sourceCode : undefined,
        httpStatus: typeof input.error.safeDetails?.httpStatus === 'number' ? input.error.safeDetails.httpStatus : undefined,
        providerCode: typeof input.error.safeDetails?.providerCode === 'string' || typeof input.error.safeDetails?.providerCode === 'number'
          ? input.error.safeDetails.providerCode
          : undefined,
        providerSubcode: typeof input.error.safeDetails?.providerSubcode === 'string' || typeof input.error.safeDetails?.providerSubcode === 'number'
          ? input.error.safeDetails.providerSubcode
          : undefined,
        providerType: typeof input.error.safeDetails?.providerType === 'string' ? input.error.safeDetails.providerType : undefined,
        traceId: typeof input.error.safeDetails?.traceId === 'string' ? input.error.safeDetails.traceId : undefined,
        retryAfterMs: typeof input.error.safeDetails?.retryAfterMs === 'number' ? input.error.safeDetails.retryAfterMs : undefined,
        correlationId: input.correlationId,
      });
    }
    return input.error;
  }

  const signals = extractSignals(input);
  const requestMayHaveSucceeded = input.requestMayHaveSucceeded === true;
  const kind = withUnknownWriteOutcome(
    classifyKind(signals, input.fallbackKind ?? 'INTERNAL'),
    input.requestKind,
    requestMayHaveSucceeded,
  );
  return createMetaSocialProviderError({
    domain: input.domain,
    operation: input.operation,
    requestKind: input.requestKind,
    kind,
    requestMayHaveSucceeded,
    sourceCode: signals.sourceCode,
    httpStatus: signals.httpStatus,
    providerCode: signals.providerCode,
    providerSubcode: signals.providerSubcode,
    providerType: signals.providerType,
    traceId: signals.traceId,
    retryAfterMs: signals.retryAfterMs,
    correlationId: input.correlationId,
  });
}

export function isMetaSocialProviderError(value: unknown): value is MetaSocialProviderError {
  if (!isMetaPlatformError(value) || !isRecord(value)) return false;
  if (Object.keys(value).some((key) => !SOCIAL_ERROR_KEYS.has(key))) return false;
  return value.provider === 'META'
    && typeof value.domain === 'string'
    && META_SOCIAL_ERROR_DOMAINS.includes(value.domain as MetaSocialErrorDomain)
    && typeof value.operation === 'string'
    && OPERATION_PATTERN.test(value.operation)
    && typeof value.requestKind === 'string'
    && META_SOCIAL_REQUEST_KINDS.includes(value.requestKind as MetaSocialRequestKind)
    && typeof value.kind === 'string'
    && META_SOCIAL_PROVIDER_ERROR_KINDS.includes(value.kind as MetaSocialProviderErrorKind)
    && typeof value.disposition === 'string'
    && META_SOCIAL_ERROR_DISPOSITIONS.includes(value.disposition as MetaSocialErrorDisposition)
    && typeof value.requestMayHaveSucceeded === 'boolean'
    && KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].code === value.code
    && KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].category === value.category
    && KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].retryable === value.retryable
    && KIND_DEFINITIONS[value.kind as MetaSocialProviderErrorKind].disposition === value.disposition
    && hasCanonicalSafeDetails(value);
}
