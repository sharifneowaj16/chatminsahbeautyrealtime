const REDACTED = '[REDACTED]';
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;
const MAX_STRING_LENGTH = 4_000;

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSensitiveKey(key: string) {
  const normalized = normalizedKey(key);
  if (/masked|hash|digest|last4|suffix/.test(normalized)) return false;
  return [
    'accesstoken', 'refreshtoken', 'appsecret', 'clientsecret', 'password', 'authorization',
    'cookie', 'setcookie', 'rawpayload', 'rawbody', 'normalizeddata', 'fielddata', 'phone',
    'email', 'ipaddress', 'clientip', 'useragent', 'secret', 'tokenref', 'payloadencrypted',
  ].some((token) => normalized === token || normalized.endsWith(token));
}

function redactString(value: string) {
  return value
    .slice(0, MAX_STRING_LENGTH)
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?880|0)1[3-9]\d{8}/g, '[REDACTED_PHONE]')
    .replace(/access_token=[^&\s]+/gi, 'access_token=[REDACTED]');
}

function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return redactString(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: redactString(value.message) };
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((item) => walk(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : walk(item, depth + 1),
    ]));
  }
  return String(value);
}

export function redactObservabilityData(value: unknown): unknown {
  return walk(value, 0);
}
