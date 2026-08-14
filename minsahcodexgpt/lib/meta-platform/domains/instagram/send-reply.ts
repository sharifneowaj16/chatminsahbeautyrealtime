import { assertMetaSocialOutboundWriteEnabled } from '../../config/social-outbound-write-control.ts';

export type InstagramReplyMode = 'MESSAGE' | 'PRIVATE_REPLY';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,160}$/;

function taggedError(message: string, code: string): Error & { code: string; status: number; retryable: false } {
  return Object.assign(new Error(message), { code, status: 409, retryable: false as const });
}

export function normalizeInstagramReplyText(value: unknown): string {
  if (typeof value !== 'string') throw taggedError('INSTAGRAM_REPLY_TEXT_INVALID', 'INSTAGRAM_REPLY_TEXT_INVALID');
  const text = value.trim();
  if (!text || text.length > 1_000) throw taggedError('INSTAGRAM_REPLY_TEXT_INVALID', 'INSTAGRAM_REPLY_TEXT_INVALID');
  return text;
}

export function normalizeInstagramReplyIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY.test(value)) {
    throw taggedError('INSTAGRAM_REPLY_IDEMPOTENCY_KEY_INVALID', 'INSTAGRAM_REPLY_IDEMPOTENCY_KEY_INVALID');
  }
  return value;
}

export function assertInstagramReplyWriteEnabledAtExecution(
  mode: InstagramReplyMode,
  env: Readonly<Record<string, string | undefined>>,
): void {
  assertMetaSocialOutboundWriteEnabled(
    mode === 'PRIVATE_REPLY' ? 'INSTAGRAM_PRIVATE_REPLY' : 'INSTAGRAM_STANDARD_REPLY',
    env,
  );
}

export type InstagramReplyExecutionAction = 'DEDUPLICATE_SENT' | 'RECONCILE' | 'MARK_UNKNOWN_AND_RECONCILE' | 'EXECUTE';

export function decideInstagramReplyExecutionAction(input: Readonly<{
  providerStatus: string | null | undefined;
  reconciliationStatus: string | null | undefined;
  providerMessageId?: string | null;
}>): InstagramReplyExecutionAction {
  if (input.providerStatus === 'SENT' && typeof input.providerMessageId === 'string' && input.providerMessageId.trim()) {
    return 'DEDUPLICATE_SENT';
  }
  if (input.providerStatus === 'UNKNOWN_OUTCOME' || input.reconciliationStatus === 'REQUIRED') return 'RECONCILE';
  if (input.providerStatus === 'SENDING') return 'MARK_UNKNOWN_AND_RECONCILE';
  return 'EXECUTE';
}
