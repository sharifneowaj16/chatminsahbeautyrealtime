import crypto from 'node:crypto';

const VERSION = 'v1';

function deriveKey(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error('META_LEAD_DATA_KEY_REQUIRED');
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return Buffer.from(trimmed, 'hex');
  try {
    const decoded = Buffer.from(trimmed, 'base64');
    if (decoded.length === 32) return decoded;
  } catch { /* fall through */ }
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

export function encryptMetaLeadPayload(value: unknown, secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptMetaLeadPayload<T = unknown>(encrypted: string, secret: string): T {
  const [version, ivValue, tagValue, ciphertextValue] = encrypted.split('.');
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) throw new Error('META_LEAD_ENCRYPTED_PAYLOAD_INVALID');
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(secret), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}
