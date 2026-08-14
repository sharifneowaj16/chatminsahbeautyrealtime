import { createHash } from 'node:crypto';
import type { NormalizedInstagramEvent } from '@/lib/meta/instagram/types';
import { normalizeInstagramInboundMessage } from './normalize-message.ts';

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function platformSnapshot(event: NormalizedInstagramEvent) {
  const normalized = normalizeInstagramInboundMessage(event as unknown as Readonly<Record<string, unknown>>);
  return Object.freeze({
    eventType: normalized.eventType,
    direction: normalized.direction,
    messageType: normalized.messageType,
    conversationKeyDigest: digest(normalized.conversationKey),
    providerMessageIdDigest: digest(normalized.providerMessageId),
    participantScopeDigest: digest(`${normalized.accountId}:${normalized.senderId}:${normalized.recipientId}`),
    occurredAt: normalized.occurredAt,
    hasText: Boolean(normalized.text),
    attachmentCount: normalized.attachments.length,
    attachmentTypes: normalized.attachments.map((item) => item.type).sort().join(','),
    hasReplyReference: Boolean(event.replyToMessageId),
    hasStoryReference: Boolean(event.storyMediaId),
    hasCommentReference: Boolean(event.commentId),
    hasPostReference: Boolean(event.postId),
    payloadDigest: normalized.payloadDigest,
  });
}

function legacySnapshot(event: NormalizedInstagramEvent) {
  return Object.freeze({
    eventType: event.eventType,
    direction: event.direction,
    messageType: event.messageType,
    conversationKeyDigest: digest(event.conversationKey),
    providerMessageIdDigest: digest(event.platformMessageId),
    participantScopeDigest: digest(`${event.accountId}:${event.senderId}:${event.recipientId}`),
    occurredAt: new Date(event.sentAt).toISOString(),
    hasText: Boolean(event.text?.trim()),
    attachmentCount: event.attachments.length,
    attachmentTypes: event.attachments.map((item) => item.type).sort().join(','),
    hasReplyReference: Boolean(event.replyToMessageId),
    hasStoryReference: Boolean(event.storyMediaId),
    hasCommentReference: Boolean(event.commentId),
    hasPostReference: Boolean(event.postId),
    payloadDigest: event.payloadDigest,
  });
}

export type InstagramShadowComparison = Readonly<{
  status: 'MATCH' | 'MISMATCH' | 'NOT_OBSERVED';
  matched: boolean | null;
  differenceCodes: readonly string[];
  safeMetrics: Readonly<{ comparedFieldCount: number; mismatchCount: number; attachmentCount: number }>;
}>;

export function compareInstagramShadowNormalization(event: NormalizedInstagramEvent): InstagramShadowComparison {
  const platform = platformSnapshot(event);
  const legacy = legacySnapshot(event);
  const keys = Object.keys(platform) as Array<keyof typeof platform>;
  const differenceCodes = keys
    .filter((key) => platform[key] !== legacy[key])
    .map((key) => `INSTAGRAM_SHADOW_${String(key).replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_MISMATCH`);
  return Object.freeze({
    status: differenceCodes.length === 0 ? 'MATCH' : 'MISMATCH',
    matched: differenceCodes.length === 0,
    differenceCodes: Object.freeze(differenceCodes),
    safeMetrics: Object.freeze({ comparedFieldCount: keys.length, mismatchCount: differenceCodes.length, attachmentCount: event.attachments.length }),
  });
}

export const META_INSTAGRAM_SHADOW_NOT_OBSERVED: InstagramShadowComparison = Object.freeze({
  status: 'NOT_OBSERVED', matched: null, differenceCodes: Object.freeze([]),
  safeMetrics: Object.freeze({ comparedFieldCount: 0, mismatchCount: 0, attachmentCount: 0 }),
});

export function compareInstagramReplyPolicyParity(input: Readonly<{
  legacy: Readonly<{ eligible: boolean; code: string; expiresAt: Date | null }>;
  platform: Readonly<{ eligible: boolean; code: string; expiresAt: Date | null }>;
}>) {
  const differenceCodes: string[] = [];
  if (input.legacy.eligible !== input.platform.eligible) differenceCodes.push('INSTAGRAM_REPLY_POLICY_ELIGIBILITY_MISMATCH');
  if (input.legacy.code !== input.platform.code) differenceCodes.push('INSTAGRAM_REPLY_POLICY_CODE_MISMATCH');
  if ((input.legacy.expiresAt?.toISOString() ?? null) !== (input.platform.expiresAt?.toISOString() ?? null)) {
    differenceCodes.push('INSTAGRAM_REPLY_POLICY_EXPIRY_MISMATCH');
  }
  return Object.freeze({ matched: differenceCodes.length === 0, differenceCodes: Object.freeze(differenceCodes) });
}
