import { createHash } from 'node:crypto';

export const META_ADMIN_DEFAULT_LIMIT = 50 as const;
export const META_ADMIN_MAX_LIMIT = 100 as const;
export const META_ADMIN_MAX_MESSAGE_LIMIT = 250 as const;

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,95}$/;
const SENSITIVE_KEY_PATTERN = /(?:access|refresh)?token|secret|password|authorization|cookie|rawpayload|rawbody|encrypted|normalizeddata|fielddata|sourceurl|externalurl|metadata$/i;
const TOKEN_VALUE_PATTERN = /(?:Bearer\s+[A-Za-z0-9._~+/=-]{12,}|EA[A-Za-z0-9_-]{15,}|(?:access|refresh)[_-]?token\s*[:=]\s*[A-Za-z0-9._~+/=-]{4,})/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /(?:\+?880|0)1[3-9]\d{8}/;

export type MetaAdminCursor = Readonly<{
  at: string;
  id: string;
}>;

export type MetaAdminPageInfo = Readonly<{
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}>;

export type MetaAdminReplyEligibility = Readonly<{
  allowed: boolean;
  policy: string;
  reasonCode: string;
  evaluatedAt: string;
  expiresAt: string | null;
}>;

function clampInteger(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function parseMetaAdminLimit(value: unknown, fallback: number = META_ADMIN_DEFAULT_LIMIT, max: number = META_ADMIN_MAX_LIMIT): number {
  return clampInteger(value, fallback, max);
}

export function parseMetaAdminMessageLimit(value: unknown, fallback = META_ADMIN_MAX_MESSAGE_LIMIT): number {
  return clampInteger(value, fallback, META_ADMIN_MAX_MESSAGE_LIMIT);
}

export function requireMetaAdminOpaqueId(value: unknown, code = 'META_ADMIN_ID_INVALID'): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!OPAQUE_ID_PATTERN.test(normalized)) throw Object.assign(new TypeError(code), { code, status: 400 });
  return normalized;
}

export function safeMetaAdminCode(value: unknown, fallback = 'UNKNOWN'): string {
  const normalized = String(value ?? fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96);
  return SAFE_CODE_PATTERN.test(normalized) ? normalized : fallback;
}

export function safeMetaAdminText(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, max)
    .replace(TOKEN_VALUE_PATTERN, '[REDACTED]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(PHONE_PATTERN, '[REDACTED_PHONE]');
}

export function toMetaAdminIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function encodeMetaAdminCursor(cursor: MetaAdminCursor): string {
  const at = toMetaAdminIso(cursor.at);
  const id = requireMetaAdminOpaqueId(cursor.id, 'META_ADMIN_CURSOR_ID_INVALID');
  if (!at) throw Object.assign(new TypeError('META_ADMIN_CURSOR_TIME_INVALID'), { code: 'META_ADMIN_CURSOR_TIME_INVALID', status: 400 });
  return Buffer.from(JSON.stringify({ at, id }), 'utf8').toString('base64url');
}

export function decodeMetaAdminCursor(value: unknown): MetaAdminCursor | null {
  if (typeof value !== 'string' || !value || value.length > 1_024) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<MetaAdminCursor>;
    const at = toMetaAdminIso(parsed.at);
    const id = typeof parsed.id === 'string' && OPAQUE_ID_PATTERN.test(parsed.id) ? parsed.id : null;
    return at && id ? Object.freeze({ at, id }) : null;
  } catch {
    return null;
  }
}

export function projectMetaAdminProviderId(value: unknown): Readonly<{ value: string; fingerprint: string }> | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!OPAQUE_ID_PATTERN.test(normalized)) return null;
  return Object.freeze({
    value: normalized,
    fingerprint: createHash('sha256').update(normalized).digest('hex').slice(0, 12),
  });
}

export function projectMetaAdminFailure(value: unknown): Readonly<Record<string, unknown>> | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const retryAt = toMetaAdminIso(row.retryAt ?? row.nextRetryAt);
  const summary = safeMetaAdminText(row.safeSummary ?? row.failureSummary ?? row.message, 300);
  return Object.freeze({
    code: safeMetaAdminCode(row.safeReasonCode ?? row.failureCode ?? row.code ?? row.name ?? 'META_OPERATION_FAILED', 'META_OPERATION_FAILED'),
    ...(typeof row.classification === 'string' ? { classification: safeMetaAdminCode(row.classification, 'UNKNOWN') } : {}),
    ...(row.retryable === true ? { retryable: true } : {}),
    ...(row.reconciliationRequired === true ? { reconciliationRequired: true } : {}),
    ...(retryAt ? { retryAt } : {}),
    ...(summary ? { summary } : {}),
  });
}

export function assertMetaAdminSafeDto(value: unknown): void {
  const visit = (current: unknown, path: string, depth: number): void => {
    if (depth > 12) throw new Error(`META_ADMIN_DTO_DEPTH_EXCEEDED:${path}`);
    if (typeof current === 'string') {
      const userContentPath = /(?:\.|\[)(?:content|text|searchText|subject)(?:\]|$)/i.test(path);
      if (!userContentPath && TOKEN_VALUE_PATTERN.test(current)) throw new Error(`META_ADMIN_DTO_SECRET_LEAK:${path}`);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`, depth + 1));
      return;
    }
    if (!current || typeof current !== 'object') return;
    for (const [key, nested] of Object.entries(current as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) throw new Error(`META_ADMIN_DTO_SENSITIVE_KEY:${path}.${key}`);
      visit(nested, `${path}.${key}`, depth + 1);
    }
  };
  visit(value, 'dto', 0);
}

export function metaAdminNoStoreHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
}
