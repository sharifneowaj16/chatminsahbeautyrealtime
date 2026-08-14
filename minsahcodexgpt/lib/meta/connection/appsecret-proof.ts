import crypto from 'node:crypto';

export function buildAppSecretProof(accessToken: string, appSecret: string) {
  if (!accessToken.trim()) throw new Error('META_ACCESS_TOKEN_REQUIRED');
  if (!appSecret.trim()) throw new Error('META_APP_SECRET_REQUIRED');
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

export function isAppSecretProof(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}
