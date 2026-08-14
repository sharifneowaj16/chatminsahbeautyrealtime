import {
  createMetaSocialProviderError,
  isMetaSocialProviderError,
  META_SOCIAL_ERROR_DISPOSITIONS,
  META_SOCIAL_ERROR_DOMAINS,
  type MetaSocialErrorDisposition,
  type MetaSocialErrorDomain,
  type MetaSocialProviderError,
} from '../errors/social-errors';

export const META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION = 1 as const;

export const META_SOCIAL_PLATFORM_RESULT_STATUSES = [
  'SUCCESS',
  ...META_SOCIAL_ERROR_DISPOSITIONS,
] as const;

export type MetaSocialPlatformResultStatus = (typeof META_SOCIAL_PLATFORM_RESULT_STATUSES)[number];

export interface MetaSocialPlatformResultBase {
  readonly schemaVersion: typeof META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly domain: MetaSocialErrorDomain;
  readonly operation: string;
  readonly correlationId: string | null;
  readonly status: MetaSocialPlatformResultStatus;
  readonly ok: boolean;
}

export interface MetaSocialPlatformSuccess<T> extends MetaSocialPlatformResultBase {
  readonly ok: true;
  readonly status: 'SUCCESS';
  readonly value: T;
}

export interface MetaSocialPlatformFailure extends MetaSocialPlatformResultBase {
  readonly ok: false;
  readonly status: MetaSocialErrorDisposition;
  readonly retryable: boolean;
  readonly requestMayHaveSucceeded: boolean;
  readonly retryAfterMs: number | null;
  readonly error: MetaSocialProviderError;
}

export type MetaSocialPlatformResult<T> = MetaSocialPlatformSuccess<T> | MetaSocialPlatformFailure;

export interface CreateMetaSocialSuccessResultInput<T> {
  readonly domain: MetaSocialErrorDomain;
  readonly operation: string;
  readonly value: T;
  readonly correlationId?: string;
}

const OPERATION_PATTERN = /^[A-Z][A-Z0-9_.:-]{2,79}$/;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const SUCCESS_KEYS = new Set([
  'schemaVersion',
  'provider',
  'domain',
  'operation',
  'correlationId',
  'status',
  'ok',
  'value',
]);
const FAILURE_KEYS = new Set([
  'schemaVersion',
  'provider',
  'domain',
  'operation',
  'correlationId',
  'status',
  'ok',
  'retryable',
  'requestMayHaveSucceeded',
  'retryAfterMs',
  'error',
]);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, allowed: ReadonlySet<string>): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function normalizeOperation(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!OPERATION_PATTERN.test(normalized)) throw new TypeError('META_SOCIAL_RESULT_OPERATION_INVALID');
  return normalized;
}

function normalizeCorrelationId(value: string | undefined): string | null {
  if (value === undefined) return null;
  const normalized = value.trim();
  if (!CORRELATION_ID_PATTERN.test(normalized)) {
    throw new TypeError('META_SOCIAL_RESULT_CORRELATION_ID_INVALID');
  }
  return normalized;
}

function retryAfterMs(error: MetaSocialProviderError): number | null {
  const value = error.safeDetails?.retryAfterMs;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function canonicalizeError(error: MetaSocialProviderError): MetaSocialProviderError {
  const details = error.safeDetails;
  return createMetaSocialProviderError({
    domain: error.domain,
    operation: error.operation,
    requestKind: error.requestKind,
    kind: error.kind,
    requestMayHaveSucceeded: error.requestMayHaveSucceeded,
    sourceCode: typeof details?.sourceCode === 'string' ? details.sourceCode : undefined,
    httpStatus: typeof details?.httpStatus === 'number' ? details.httpStatus : undefined,
    providerCode: typeof details?.providerCode === 'string' || typeof details?.providerCode === 'number'
      ? details.providerCode
      : undefined,
    providerSubcode: typeof details?.providerSubcode === 'string' || typeof details?.providerSubcode === 'number'
      ? details.providerSubcode
      : undefined,
    providerType: typeof details?.providerType === 'string' ? details.providerType : undefined,
    traceId: typeof details?.traceId === 'string' ? details.traceId : undefined,
    retryAfterMs: typeof details?.retryAfterMs === 'number' ? details.retryAfterMs : undefined,
    correlationId: error.correlationId,
  });
}

export function createMetaSocialSuccessResult<T>(
  input: CreateMetaSocialSuccessResultInput<T>,
): MetaSocialPlatformSuccess<T> {
  if (!META_SOCIAL_ERROR_DOMAINS.includes(input.domain)) {
    throw new TypeError('META_SOCIAL_RESULT_DOMAIN_INVALID');
  }

  return Object.freeze({
    schemaVersion: META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION,
    provider: 'META' as const,
    domain: input.domain,
    operation: normalizeOperation(input.operation),
    correlationId: normalizeCorrelationId(input.correlationId),
    status: 'SUCCESS' as const,
    ok: true as const,
    value: input.value,
  });
}

export function createMetaSocialFailureResult(
  error: MetaSocialProviderError,
): MetaSocialPlatformFailure {
  if (!isMetaSocialProviderError(error)) {
    throw new TypeError('META_SOCIAL_RESULT_ERROR_INVALID');
  }
  const canonicalError = canonicalizeError(error);
  const correlationId = normalizeCorrelationId(canonicalError.correlationId);

  return Object.freeze({
    schemaVersion: META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION,
    provider: 'META' as const,
    domain: canonicalError.domain,
    operation: canonicalError.operation,
    correlationId,
    status: canonicalError.disposition,
    ok: false as const,
    retryable: canonicalError.retryable,
    requestMayHaveSucceeded: canonicalError.requestMayHaveSucceeded,
    retryAfterMs: retryAfterMs(canonicalError),
    error: canonicalError,
  });
}

export function isMetaSocialPlatformResult(value: unknown): value is MetaSocialPlatformResult<unknown> {
  if (!isRecord(value)
    || value.schemaVersion !== META_SOCIAL_PLATFORM_RESULT_SCHEMA_VERSION
    || value.provider !== 'META'
    || typeof value.domain !== 'string'
    || !META_SOCIAL_ERROR_DOMAINS.includes(value.domain as MetaSocialErrorDomain)
    || typeof value.operation !== 'string'
    || !OPERATION_PATTERN.test(value.operation)
    || (value.correlationId !== null
      && (typeof value.correlationId !== 'string' || !CORRELATION_ID_PATTERN.test(value.correlationId)))) {
    return false;
  }

  if (value.ok === true) {
    return value.status === 'SUCCESS'
      && hasExactKeys(value, SUCCESS_KEYS)
      && Object.prototype.hasOwnProperty.call(value, 'value');
  }

  if (value.ok !== false
    || typeof value.status !== 'string'
    || !META_SOCIAL_ERROR_DISPOSITIONS.includes(value.status as MetaSocialErrorDisposition)
    || !hasExactKeys(value, FAILURE_KEYS)
    || typeof value.retryable !== 'boolean'
    || typeof value.requestMayHaveSucceeded !== 'boolean'
    || (value.retryAfterMs !== null
      && (typeof value.retryAfterMs !== 'number'
        || !Number.isInteger(value.retryAfterMs)
        || value.retryAfterMs < 0))
    || !isMetaSocialProviderError(value.error)) {
    return false;
  }

  const error = value.error;
  return value.domain === error.domain
    && value.operation === error.operation
    && value.correlationId === (error.correlationId ?? null)
    && value.status === error.disposition
    && value.retryable === error.retryable
    && value.requestMayHaveSucceeded === error.requestMayHaveSucceeded
    && value.retryAfterMs === retryAfterMs(error);
}
