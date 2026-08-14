import type { MetaProviderUsageSignal } from './types';

function boundedPercent(value: unknown): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(0, Math.min(100, number));
}

function maxNumber(values: readonly (number | undefined)[]): number | undefined {
  const valid = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  return valid.length ? Math.max(...valid) : undefined;
}

function parseJson(value: string | undefined): unknown {
  if (!value) return undefined;
  try { return JSON.parse(value); } catch { return undefined; }
}

function collectUsagePercent(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entries = Object.values(value as Record<string, unknown>);
  const direct = value as Record<string, unknown>;
  const directValues = [direct.call_count, direct.total_cputime, direct.total_time].map(boundedPercent);
  const nestedValues = entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const nested = entry as Record<string, unknown>;
    return [nested.call_count, nested.total_cputime, nested.total_time].map(boundedPercent);
  });
  return maxNumber([...directValues, ...nestedValues]);
}

function retryAfterMs(value: string | undefined, now: Date): number | undefined {
  if (!value?.trim()) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.max(0, date.getTime() - now.getTime());
}

function estimatedRegainMs(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidates: number[] = [];
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const number = Number((entry as Record<string, unknown>).estimated_time_to_regain_access);
    if (Number.isFinite(number) && number >= 0) candidates.push(number * 60 * 1_000);
  }
  return candidates.length ? Math.max(...candidates) : undefined;
}

export function parseMetaProviderUsageHeaders(
  headers: Readonly<Record<string, string>> | Headers | undefined,
  now = new Date(),
): MetaProviderUsageSignal {
  const get = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  };
  const app = parseJson(get('x-app-usage'));
  const page = parseJson(get('x-page-usage'));
  const ad = parseJson(get('x-ad-account-usage') ?? get('x-business-use-case-usage'));
  return Object.freeze({
    ...(retryAfterMs(get('retry-after'), now) !== undefined ? { retryAfterMs: retryAfterMs(get('retry-after'), now) } : {}),
    ...(collectUsagePercent(app) !== undefined ? { appUsagePercent: collectUsagePercent(app) } : {}),
    ...(collectUsagePercent(page) !== undefined ? { pageUsagePercent: collectUsagePercent(page) } : {}),
    ...(collectUsagePercent(ad) !== undefined ? { adAccountUsagePercent: collectUsagePercent(ad) } : {}),
    ...(estimatedRegainMs(ad) !== undefined ? { estimatedTimeToRegainAccessMs: estimatedRegainMs(ad) } : {}),
  });
}


export function metaProviderUsageFromError(error: unknown): MetaProviderUsageSignal | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const details = (error as { readonly safeDetails?: unknown }).safeDetails;
  if (!details || typeof details !== 'object') return undefined;
  const source = details as Record<string, unknown>;
  const signal: MetaProviderUsageSignal = Object.freeze({
    ...(Number.isFinite(Number(source.retryAfterMs)) ? { retryAfterMs: Number(source.retryAfterMs) } : {}),
    ...(Number.isFinite(Number(source.estimatedTimeToRegainAccessMs)) ? { estimatedTimeToRegainAccessMs: Number(source.estimatedTimeToRegainAccessMs) } : {}),
    ...(Number.isFinite(Number(source.appUsagePercent)) ? { appUsagePercent: Number(source.appUsagePercent) } : {}),
    ...(Number.isFinite(Number(source.pageUsagePercent)) ? { pageUsagePercent: Number(source.pageUsagePercent) } : {}),
    ...(Number.isFinite(Number(source.adAccountUsagePercent)) ? { adAccountUsagePercent: Number(source.adAccountUsagePercent) } : {}),
  });
  return Object.keys(signal).length ? signal : undefined;
}
