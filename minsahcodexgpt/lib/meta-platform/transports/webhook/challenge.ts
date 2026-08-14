import { timingSafeEqual } from 'node:crypto';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export type MetaWebhookChallengeResult =
  | { readonly ok: true; readonly challenge: string }
  | { readonly ok: false; readonly code: 'MODE_INVALID' | 'VERIFY_TOKEN_MISSING' | 'VERIFY_TOKEN_MISMATCH' | 'CHALLENGE_MISSING' };

export function verifyMetaWebhookChallenge(input: {
  readonly mode?: string | null;
  readonly token?: string | null;
  readonly challenge?: string | null;
  readonly expectedToken?: string | null;
}): MetaWebhookChallengeResult {
  if (input.mode !== 'subscribe') return { ok: false, code: 'MODE_INVALID' };
  const expectedToken = input.expectedToken?.trim();
  if (!expectedToken) return { ok: false, code: 'VERIFY_TOKEN_MISSING' };
  if (!input.challenge?.trim()) return { ok: false, code: 'CHALLENGE_MISSING' };
  if (!safeEqual(input.token ?? '', expectedToken)) return { ok: false, code: 'VERIFY_TOKEN_MISMATCH' };
  return { ok: true, challenge: input.challenge };
}
