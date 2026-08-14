import crypto from 'node:crypto';
import { normalizePiiEmail, normalizePiiPhone, normalizePiiText } from './pii-normalize';

export const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX_PATTERN.test(value);
}

export function hashNormalizedPii(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (isSha256Hex(normalized)) return normalized.toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function hashPiiEmail(value?: string | null) {
  return hashNormalizedPii(normalizePiiEmail(value));
}

export function hashPiiPhone(value?: string | null) {
  return hashNormalizedPii(normalizePiiPhone(value));
}

export function hashPiiText(value?: string | null) {
  return hashNormalizedPii(normalizePiiText(value));
}
