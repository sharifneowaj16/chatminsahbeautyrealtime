import type Redis from 'ioredis';

export type MetaRateLimitHeaders = {
  retryAfterMs?: number;
  appUsagePercent?: number;
  accountUsagePercent?: number;
  businessUsagePercent?: number;
};

function parsePercentJson(raw: string | null | undefined) {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const numbers: number[] = [];
    const visit = (entry: unknown) => {
      if (typeof entry === 'number' && Number.isFinite(entry)) numbers.push(entry);
      else if (entry && typeof entry === 'object') Object.values(entry as Record<string, unknown>).forEach(visit);
    };
    visit(value);
    return numbers.length ? Math.max(...numbers) : undefined;
  } catch {
    return undefined;
  }
}

export function parseMetaRateLimitHeaders(headers: Record<string, string | undefined>): MetaRateLimitHeaders {
  const retryAfterRaw = headers['retry-after'];
  const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : undefined;
  return {
    retryAfterMs: retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds)
      ? Math.max(0, retryAfterSeconds * 1_000)
      : undefined,
    appUsagePercent: parsePercentJson(headers['x-app-usage']),
    accountUsagePercent: parsePercentJson(headers['x-ad-account-usage']),
    businessUsagePercent: parsePercentJson(headers['x-business-use-case-usage']),
  };
}

export function computeMetaAdaptiveCooldownMs(input: {
  status?: number;
  headers?: MetaRateLimitHeaders;
}) {
  const headerCooldown = input.headers?.retryAfterMs ?? 0;
  const peak = Math.max(
    input.headers?.appUsagePercent ?? 0,
    input.headers?.accountUsagePercent ?? 0,
    input.headers?.businessUsagePercent ?? 0
  );
  if (input.status === 429) return Math.max(60_000, headerCooldown);
  if (peak >= 100) return Math.max(15 * 60_000, headerCooldown);
  if (peak >= 95) return Math.max(5 * 60_000, headerCooldown);
  if (peak >= 85) return Math.max(60_000, headerCooldown);
  return headerCooldown;
}

const TOKEN_BUCKET_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if current <= tonumber(ARGV[2]) then return {1, ttl, current} end
return {0, ttl, current}
`;

export async function acquireMetaRateLimitPermit(
  redis: Pick<Redis, 'eval'>,
  input: { provider: string; max: number; durationMs: number }
) {
  const window = Math.floor(Date.now() / input.durationMs);
  const key = `meta:v6:rate:${input.provider}:${window}`;
  const result = await redis.eval(TOKEN_BUCKET_SCRIPT, 1, key, input.durationMs, input.max) as [number, number, number];
  return { allowed: Number(result[0]) === 1, retryAfterMs: Math.max(0, Number(result[1])), count: Number(result[2]) };
}

export async function setMetaProviderCooldown(
  redis: Pick<Redis, 'set'>,
  provider: string,
  durationMs: number,
  reason: string
) {
  if (durationMs <= 0) return;
  await redis.set(
    `meta:v6:cooldown:${provider}`,
    JSON.stringify({ reason, setAt: new Date().toISOString() }),
    'PX',
    Math.max(1_000, durationMs)
  );
}

export async function getMetaProviderCooldownMs(
  redis: Pick<Redis, 'pttl'>,
  provider: string
) {
  const ttl = await redis.pttl(`meta:v6:cooldown:${provider}`);
  return ttl > 0 ? ttl : 0;
}
