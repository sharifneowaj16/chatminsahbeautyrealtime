import { createMetaPlatformError, type MetaPlatformError } from '../../core/errors';
import { parseMetaProviderUsageHeaders } from '../../reliability/provider-usage';

interface ProviderErrorPayload {
  readonly error?: {
    readonly message?: unknown;
    readonly type?: unknown;
    readonly code?: unknown;
    readonly error_subcode?: unknown;
    readonly is_transient?: unknown;
    readonly error_user_title?: unknown;
    readonly error_user_msg?: unknown;
    readonly fbtrace_id?: unknown;
  };
}

const SECRET_PATTERNS = [
  /EA[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._|:-]+/gi,
  /access_token=[^&\s]+/gi,
  /input_token=[^&\s]+/gi,
  /appsecret_proof=[^&\s]+/gi,
  /client_secret=[^&\s]+/gi,
];

export function redactMetaGraphText(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[REDACTED]'), value).slice(0, 500);
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function normalizeMetaGraphError(input: {
  readonly payload?: unknown;
  readonly status?: number;
  readonly fallbackCode?: string;
  readonly correlationId?: string;
  readonly cause?: unknown;
  readonly headers?: Readonly<Record<string, string>> | Headers;
}): MetaPlatformError {
  const root = input.payload && typeof input.payload === 'object' ? input.payload as ProviderErrorPayload : {};
  const provider = root.error;
  const status = input.status;
  const providerCode = numberOrUndefined(provider?.code);
  const subcode = numberOrUndefined(provider?.error_subcode);
  const traceId = typeof provider?.fbtrace_id === 'string' ? provider.fbtrace_id.slice(0, 160) : undefined;
  const providerUsage = parseMetaProviderUsageHeaders(input.headers);
  const rawMessage = typeof provider?.message === 'string'
    ? provider.message
    : input.cause instanceof Error
      ? input.cause.message
      : status
        ? `Meta Graph request failed with HTTP ${status}.`
        : 'Meta Graph request failed.';

  let category: MetaPlatformError['category'] = 'DEPENDENCY_UNAVAILABLE';
  let code = input.fallbackCode ?? 'META_GRAPH_REQUEST_FAILED';
  let retryable = false;
  if (providerCode === 190 || status === 401) { category = 'AUTHENTICATION'; code = 'META_GRAPH_AUTHENTICATION_FAILED'; }
  else if (providerCode === 10 || providerCode === 200 || status === 403) { category = 'AUTHORIZATION'; code = 'META_GRAPH_AUTHORIZATION_FAILED'; }
  else if (providerCode === 4 || providerCode === 17 || providerCode === 32 || providerCode === 613 || status === 429) { category = 'RATE_LIMIT'; code = 'META_GRAPH_RATE_LIMITED'; retryable = true; }
  else if (status === 404) { category = 'NOT_FOUND'; code = 'META_GRAPH_RESOURCE_NOT_FOUND'; }
  else if (status === 409) { category = 'CONFLICT'; code = 'META_GRAPH_CONFLICT'; }
  else if (status !== undefined && status >= 500) { category = 'DEPENDENCY_UNAVAILABLE'; code = 'META_GRAPH_DEPENDENCY_UNAVAILABLE'; retryable = true; }
  else if (provider?.is_transient === true) { retryable = true; }

  return createMetaPlatformError({
    code,
    category,
    message: redactMetaGraphText(rawMessage),
    retryable,
    safeDetails: {
      ...(status !== undefined ? { httpStatus: status } : {}),
      ...(providerCode !== undefined ? { providerCode } : {}),
      ...(subcode !== undefined ? { providerSubcode: subcode } : {}),
      ...(typeof provider?.type === 'string' ? { providerType: provider.type.slice(0, 100) } : {}),
      ...(traceId ? { traceId } : {}),
      ...(providerUsage.retryAfterMs !== undefined ? { retryAfterMs: providerUsage.retryAfterMs } : {}),
      ...(providerUsage.estimatedTimeToRegainAccessMs !== undefined ? { estimatedTimeToRegainAccessMs: providerUsage.estimatedTimeToRegainAccessMs } : {}),
      ...(providerUsage.appUsagePercent !== undefined ? { appUsagePercent: providerUsage.appUsagePercent } : {}),
      ...(providerUsage.pageUsagePercent !== undefined ? { pageUsagePercent: providerUsage.pageUsagePercent } : {}),
      ...(providerUsage.adAccountUsagePercent !== undefined ? { adAccountUsagePercent: providerUsage.adAccountUsagePercent } : {}),
    },
    correlationId: input.correlationId,
  });
}

export function extractMetaGraphTraceId(payload: unknown, headers: Headers): string | undefined {
  const header = headers.get('x-fb-trace-id') ?? headers.get('x-fb-request-id');
  if (header?.trim()) return header.trim().slice(0, 160);
  const error = payload && typeof payload === 'object' ? (payload as ProviderErrorPayload).error : undefined;
  return typeof error?.fbtrace_id === 'string' ? error.fbtrace_id.slice(0, 160) : undefined;
}
