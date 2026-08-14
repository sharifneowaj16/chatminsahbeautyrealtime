import crypto from 'node:crypto';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

export function normalizeMetaEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, '');
  return normalized || undefined;
}

export function normalizeMetaPhone(value?: string | null) {
  if (!value) return undefined;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `880${digits}`;
  return undefined;
}

export function hashMetaUserValue(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (SHA256_HEX.test(normalized)) return normalized.toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
