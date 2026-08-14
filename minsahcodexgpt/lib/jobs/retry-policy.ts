export type MetaProviderErrorClass = 'RATE_LIMIT' | 'TRANSIENT' | 'AUTH' | 'PERMANENT';

// Initial execution is immediate. Subsequent provider attempts follow
// 1 minute, 5 minutes, 15 minutes and 1 hour.
export const META_PROVIDER_RETRY_SCHEDULE_MS = [
  0,
  60_000,
  300_000,
  900_000,
  3_600_000,
] as const;
export const META_PROVIDER_MAX_ATTEMPTS = META_PROVIDER_RETRY_SCHEDULE_MS.length;

function errorRecord(error: unknown) {
  return typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function extractProviderErrorStatus(error: unknown) {
  const record = errorRecord(error);
  const direct = numberValue(record.status ?? record.statusCode ?? record.providerStatus);
  if (direct) return direct;
  const message = error instanceof Error ? error.message : String(error ?? '');
  const match = message.match(/(?:status|error)\D*(429|5\d\d|4\d\d)/i);
  return match ? Number(match[1]) : undefined;
}

export function extractRetryAfterMs(error: unknown) {
  const record = errorRecord(error);
  const direct = numberValue(record.retryAfterMs);
  if (direct !== undefined) return Math.max(0, direct);
  const seconds = numberValue(record.retryAfterSeconds);
  return seconds === undefined ? undefined : Math.max(0, seconds * 1_000);
}

export function classifyMetaProviderError(error: unknown): MetaProviderErrorClass {
  const record = errorRecord(error);
  const status = extractProviderErrorStatus(error);
  const code = String(record.errorCode ?? record.code ?? '');
  if (status === 429 || ['4', '17', '32', '613'].includes(code)) return 'RATE_LIMIT';
  if (code === '190') return 'AUTH';
  if (!status || status >= 500) return 'TRANSIENT';
  if (status >= 400) return 'PERMANENT';
  return 'TRANSIENT';
}

export function getMetaProviderRetryDelayMs(attemptsMade: number, error?: unknown) {
  const record = errorRecord(error);
  const decided = numberValue(record.retryDelayMs);
  if (decided !== undefined) return Math.max(0, decided);
  const scheduleIndex = Math.max(1, Math.min(attemptsMade, META_PROVIDER_RETRY_SCHEDULE_MS.length - 1));
  const scheduled = META_PROVIDER_RETRY_SCHEDULE_MS[scheduleIndex];
  return Math.max(scheduled, extractRetryAfterMs(error) ?? 0);
}

export function getMetaProviderRetryDecision(attemptsMade: number, error: unknown) {
  const classification = classifyMetaProviderError(error);
  const retry = classification === 'RATE_LIMIT' || classification === 'TRANSIENT';
  return {
    classification,
    retry,
    delayMs: retry ? getMetaProviderRetryDelayMs(attemptsMade, error) : 0,
  };
}

export function metaJobBackoffStrategy(attemptsMade: number, type?: string, error?: Error) {
  if (type !== 'meta-provider') return -1;
  return getMetaProviderRetryDelayMs(attemptsMade, error);
}
