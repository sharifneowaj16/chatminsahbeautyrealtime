import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { MetaWebhookSignatureResult } from './types';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyMetaWebhookSignature(input: {
  readonly rawBody: string | Buffer;
  readonly signatureHeader?: string | null;
  readonly appSecret?: string | null;
}): MetaWebhookSignatureResult {
  const signature = input.signatureHeader?.trim();
  const secret = input.appSecret?.trim();
  if (!signature) return { ok: false, code: 'SIGNATURE_MISSING' };
  if (!secret) return { ok: false, code: 'APP_SECRET_MISSING' };
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return { ok: false, code: 'SIGNATURE_FORMAT_INVALID' };
  const expected = `sha256=${createHmac('sha256', secret).update(input.rawBody).digest('hex')}`;
  return safeEqual(signature.toLowerCase(), expected.toLowerCase())
    ? { ok: true, algorithm: 'sha256' }
    : { ok: false, code: 'SIGNATURE_MISMATCH' };
}

export function digestMetaWebhookPayload(rawBody: string | Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex');
}
