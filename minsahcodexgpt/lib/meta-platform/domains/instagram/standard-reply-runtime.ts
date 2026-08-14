import type { MetaInstagramOutboundProcessorInput } from '@/lib/meta-platform/queue/instagram-outbound-job';
import { executeInstagramReplyAttempt, sendInstagramReply } from '@/lib/meta/instagram/messages';
import { assertInstagramCutoverWriteAuthority, getMetaInstagramCutoverStatus } from './cutover.ts';
import {
  assertInstagramReplyWriteEnabledAtExecution,
  normalizeInstagramReplyIdempotencyKey,
  normalizeInstagramReplyText,
} from './send-reply';

export type InstagramStandardReplyRequest = Readonly<{
  conversationId: string;
  actorId: string;
  text: string;
  idempotencyKey: string;
  sourceMessageId?: string | null;
  now?: Date;
}>;

function attachCutover<T>(value: T, source: Readonly<Record<string, string | undefined>>): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const cutover = getMetaInstagramCutoverStatus(source);
  return Object.freeze({
    ...(value as Record<string, unknown>),
    cutover: Object.freeze({ mode: cutover.outbound.mode, authority: cutover.outbound.authority, reasonCode: cutover.outbound.reasonCode }),
  }) as T;
}

export async function requestInstagramStandardReplyProduction(input: InstagramStandardReplyRequest) {
  const text = normalizeInstagramReplyText(input.text);
  const idempotencyKey = normalizeInstagramReplyIdempotencyKey(input.idempotencyKey);
  assertInstagramCutoverWriteAuthority('STANDARD', process.env);
  return attachCutover(await sendInstagramReply({ ...input, text, idempotencyKey, mode: 'MESSAGE' }), process.env);
}

export async function executeInstagramStandardReplyProduction(input: MetaInstagramOutboundProcessorInput) {
  if (input.mode !== 'MESSAGE') throw Object.assign(new Error('INSTAGRAM_STANDARD_REPLY_MODE_INVALID'), { retryable: false });
  // Re-read both cutover authority and emergency controls at worker execution time.
  assertInstagramCutoverWriteAuthority('STANDARD', process.env);
  assertInstagramReplyWriteEnabledAtExecution('MESSAGE', process.env);
  return executeInstagramReplyAttempt({ ...input, mode: 'MESSAGE' });
}
