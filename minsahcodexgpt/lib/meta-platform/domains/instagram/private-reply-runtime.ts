import type { MetaInstagramOutboundProcessorInput } from '@/lib/meta-platform/queue/instagram-outbound-job';
import { executeInstagramReplyAttempt, sendInstagramReply } from '@/lib/meta/instagram/messages';
import { assertInstagramCutoverWriteAuthority, getMetaInstagramCutoverStatus } from './cutover.ts';
import {
  assertInstagramReplyWriteEnabledAtExecution,
  normalizeInstagramReplyIdempotencyKey,
  normalizeInstagramReplyText,
} from './send-reply';

function cleanId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export type InstagramPrivateReplyRequest = Readonly<{
  conversationId: string;
  actorId: string;
  text: string;
  idempotencyKey: string;
  sourceMessageId: string;
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

export async function requestInstagramPrivateReplyProduction(input: InstagramPrivateReplyRequest) {
  const text = normalizeInstagramReplyText(input.text);
  const idempotencyKey = normalizeInstagramReplyIdempotencyKey(input.idempotencyKey);
  const sourceMessageId = cleanId(input.sourceMessageId);
  if (!sourceMessageId) throw Object.assign(new Error('INSTAGRAM_PRIVATE_REPLY_SOURCE_REQUIRED'), { retryable: false });
  assertInstagramCutoverWriteAuthority('PRIVATE', process.env);
  return attachCutover(await sendInstagramReply({ ...input, sourceMessageId, text, idempotencyKey, mode: 'PRIVATE_REPLY' }), process.env);
}

export async function executeInstagramPrivateReplyProduction(input: MetaInstagramOutboundProcessorInput) {
  if (input.mode !== 'PRIVATE_REPLY') {
    throw Object.assign(new Error('INSTAGRAM_PRIVATE_REPLY_MODE_INVALID'), { retryable: false });
  }
  assertInstagramCutoverWriteAuthority('PRIVATE', process.env);
  assertInstagramReplyWriteEnabledAtExecution('PRIVATE_REPLY', process.env);
  return executeInstagramReplyAttempt({ ...input, mode: 'PRIVATE_REPLY' });
}
