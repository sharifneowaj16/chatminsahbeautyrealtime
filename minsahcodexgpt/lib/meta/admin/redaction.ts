const REDACTED = '[REDACTED]';
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;
const MAX_STRING_LENGTH = 4_000;
const MAX_HASH_DEPTH = 32;

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSensitiveKey(key: string) {
  const normalized = normalizedKey(key);
  if (/masked|hash|last4|suffix/.test(normalized)) return false;
  return [
    'accesstoken', 'refreshtoken', 'appsecret', 'clientsecret', 'password', 'authorization',
    'cookie', 'setcookie', 'rawpayload', 'rawbody', 'normalizeddata', 'phone', 'email',
    'ipaddress', 'clientip', 'useragent', 'secret', 'tokenref',
  ].some((token) => normalized === token || normalized.endsWith(token));
}

function redactSensitiveStringPatterns(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?880|0)1[3-9]\d{8}/g, '[REDACTED_PHONE]');
}

function redactString(value: string) {
  return redactSensitiveStringPatterns(value.slice(0, MAX_STRING_LENGTH));
}

function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return redactString(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((item) => walk(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        isSensitiveKey(key) ? REDACTED : walk(item, depth + 1),
      ])
    );
  }
  return String(value);
}

export function redactMetaAdminData(value: unknown): unknown {
  return walk(value, 0);
}


function walkForHash(value: unknown, depth: number, active: WeakSet<object>): unknown {
  if (depth > MAX_HASH_DEPTH) throw new TypeError('META_ADMIN_HASH_PAYLOAD_TOO_DEEP');
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return redactSensitiveStringPatterns(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (active.has(value)) throw new TypeError('META_ADMIN_HASH_PAYLOAD_CYCLIC');
    active.add(value);
    try {
      return value.map((item) => walkForHash(item, depth + 1, active));
    } finally {
      active.delete(value);
    }
  }
  if (typeof value === 'object') {
    if (active.has(value)) throw new TypeError('META_ADMIN_HASH_PAYLOAD_CYCLIC');
    active.add(value);
    try {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          isSensitiveKey(key) ? REDACTED : walkForHash(item, depth + 1, active),
        ])
      );
    } finally {
      active.delete(value);
    }
  }
  return String(value);
}

/**
 * Redacts secrets/PII without truncating arrays or strings so an approval hash
 * covers the full executable payload. Storage/display redaction remains bounded.
 */
export function redactMetaAdminDataForHash(value: unknown): unknown {
  return walkForHash(value, 0, new WeakSet<object>());
}
