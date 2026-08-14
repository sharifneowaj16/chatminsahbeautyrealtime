import { createMetaPlatformError, type MetaPlatformError } from '../../core/errors';
import type { MetaSdkExportable } from './types';

export interface MetaBusinessSdkCursor<T = unknown> {
  readonly data: readonly T[];
  readonly paging: unknown | null;
  readonly summary: unknown | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeMetaBusinessSdkValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeMetaBusinessSdkValue(item));
  if (!isRecord(value)) return value;
  const exportable = value as MetaSdkExportable;
  const exported = exportable.exportAllData?.() ?? exportable.exportData?.();
  return exported ? normalizeMetaBusinessSdkValue(exported) : value;
}

export function normalizeMetaBusinessSdkCursor<T = unknown>(value: unknown): MetaBusinessSdkCursor<T> {
  const cursor = value as MetaSdkExportable;
  return Object.freeze({
    data: Object.freeze(Array.isArray(value)
      ? value.map((item) => normalizeMetaBusinessSdkValue(item) as T)
      : []),
    paging: cursor?.paging ?? null,
    summary: cursor?.summary ?? null,
  });
}

export function normalizeMetaBusinessSdkError(
  error: unknown,
  input: {
    readonly operation: string;
    readonly correlationId?: string;
  },
): MetaPlatformError {
  const candidate = isRecord(error) ? error : {};
  const response = isRecord(candidate.response) ? candidate.response : {};
  const responseData = isRecord(response.data) ? response.data : {};
  const payload = isRecord(responseData.error)
    ? responseData.error
    : isRecord(candidate.error)
      ? candidate.error
      : {};

  const status = readNumber(response.status) ?? readNumber(candidate.status);
  const providerCode = readString(payload.code) ?? readNumber(payload.code);
  const providerSubcode = readString(payload.error_subcode) ?? readNumber(payload.error_subcode);
  const traceId = readString(payload.fbtrace_id);
  const message = readString(payload.message)
    ?? readString(candidate.message)
    ?? 'Meta Business SDK request failed.';

  const rateLimited = status === 429 || providerCode === 4 || providerCode === 17 || providerCode === 32 || providerCode === 613;
  const timeout = candidate.name === 'AbortError' || candidate.code === 'META_BUSINESS_SDK_TIMEOUT';
  const authentication = status === 401 || providerCode === 190;
  const authorization = status === 403 || providerCode === 10 || providerCode === 200;

  return createMetaPlatformError({
    code: timeout
      ? 'META_BUSINESS_SDK_TIMEOUT'
      : rateLimited
        ? 'META_BUSINESS_SDK_RATE_LIMITED'
        : authentication
          ? 'META_BUSINESS_SDK_AUTHENTICATION_FAILED'
          : authorization
            ? 'META_BUSINESS_SDK_AUTHORIZATION_FAILED'
            : 'META_BUSINESS_SDK_REQUEST_FAILED',
    category: timeout
      ? 'TIMEOUT'
      : rateLimited
        ? 'RATE_LIMIT'
        : authentication
          ? 'AUTHENTICATION'
          : authorization
            ? 'AUTHORIZATION'
            : status && status >= 500
              ? 'DEPENDENCY_UNAVAILABLE'
              : 'INTERNAL',
    message,
    retryable: timeout || rateLimited || Boolean(status && status >= 500),
    safeDetails: {
      operation: input.operation,
      ...(status !== undefined ? { status } : {}),
      ...(providerCode !== undefined ? { providerCode } : {}),
      ...(providerSubcode !== undefined ? { providerSubcode } : {}),
      ...(traceId ? { traceId } : {}),
    },
    correlationId: input.correlationId,
  });
}
