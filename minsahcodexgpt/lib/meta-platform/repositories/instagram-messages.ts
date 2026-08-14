import { createHash, randomUUID } from 'node:crypto';

export type MetaInstagramScope = Readonly<{
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  connectionKey: string;
  accountIdentityReferenceId: string;
}>;

export type InstagramConversationKind = 'DIRECT' | 'COMMENT_THREAD' | 'STORY_THREAD' | 'UNKNOWN';
export type InstagramMessageDirection = 'INBOUND' | 'OUTBOUND';
export type InstagramProviderDeliveryStatus =
  | 'NOT_APPLICABLE' | 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ'
  | 'FAILED' | 'UNKNOWN_OUTCOME';
export type InstagramPrivateReplyStatus =
  | 'RESERVED' | 'SENDING' | 'SENT' | 'BLOCKED' | 'FAILED_DEFINITIVE' | 'UNKNOWN_OUTCOME';
export type InstagramAttachmentDecision = 'PENDING' | 'ALLOWED' | 'QUARANTINED' | 'REJECTED' | 'FAILED';

export class MetaInstagramPersistenceError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = 'MetaInstagramPersistenceError'; this.code = code; }
}

export type InstagramParticipantRecord = MetaInstagramScope & Readonly<{
  id: string;
  providerParticipantId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}>;

export type InstagramConversationRecord = MetaInstagramScope & Readonly<{
  id: string;
  providerConversationKey: string;
  participantIdentityId: string;
  kind: InstagramConversationKind;
  lastActivityAt: Date | null;
  lastActivityProviderMessageId: string | null;
  lastInboundAt: Date | null;
  replyWindowOpenedAt: Date | null;
  replyWindowExpiresAt: Date | null;
  replyWindowSourceMessageId: string | null;
  orderingVersion: number;
}>;

export type InstagramMessageRecord = MetaInstagramScope & Readonly<{
  id: string;
  conversationId: string;
  providerMessageId: string | null;
  localMessageKey: string;
  direction: InstagramMessageDirection;
  payloadDigest: string | null;
  digestMismatchCount: number;
  lastDigestMismatchAt: Date | null;
  providerOccurredAt: Date;
  providerStatus: InstagramProviderDeliveryStatus;
  privateReplyExpiresAt: Date | null;
  commentId: string | null;
}>;

export type InstagramReceiptMessageLink = Readonly<{ receiptId: string; messageId: string }>;

function requireText(value: string, code: string) {
  const normalized = value.trim();
  if (!normalized) throw new MetaInstagramPersistenceError(code);
  return normalized;
}
function scopeKey(scope: MetaInstagramScope) {
  return `${scope.environment}\u001f${requireText(scope.connectionKey, 'INSTAGRAM_CONNECTION_KEY_REQUIRED')}\u001f${requireText(scope.accountIdentityReferenceId, 'INSTAGRAM_ACCOUNT_IDENTITY_REQUIRED')}`;
}
function conversationKey(scope: MetaInstagramScope, providerConversationKey: string) {
  return `${scopeKey(scope)}\u001f${requireText(providerConversationKey, 'INSTAGRAM_CONVERSATION_KEY_REQUIRED')}`;
}
function participantKey(scope: MetaInstagramScope, providerParticipantId: string) {
  return `${scopeKey(scope)}\u001f${requireText(providerParticipantId, 'INSTAGRAM_PARTICIPANT_ID_REQUIRED')}`;
}
function messageKey(scope: MetaInstagramScope, providerMessageId: string) {
  return `${scopeKey(scope)}\u001f${requireText(providerMessageId, 'INSTAGRAM_PROVIDER_MESSAGE_ID_REQUIRED')}`;
}
export function buildInstagramLocalMessageKey(input: MetaInstagramScope & { seed: string }) {
  return createHash('sha256').update(`${scopeKey(input)}\u001f${input.seed}`).digest('hex');
}
export function compareInstagramActivity(aAt: Date, aProviderId: string, bAt: Date | null, bProviderId: string | null) {
  if (!bAt) return 1;
  const delta = aAt.getTime() - bAt.getTime();
  if (delta !== 0) return delta > 0 ? 1 : -1;
  return aProviderId.localeCompare(bProviderId ?? '');
}

export class InMemoryInstagramPersistenceRepository {
  #createId: () => string;
  #participants = new Map<string, InstagramParticipantRecord>();
  #conversations = new Map<string, InstagramConversationRecord>();
  #messages = new Map<string, InstagramMessageRecord>();
  #receiptLinks = new Map<string, string>();
  constructor(options: { createId?: () => string } = {}) { this.#createId = options.createId ?? randomUUID; }

  upsertParticipant(input: MetaInstagramScope & { providerParticipantId: string; username?: string | null; displayName?: string | null; avatarUrl?: string | null; seenAt?: Date }) {
    const key = participantKey(input, input.providerParticipantId); const seenAt = input.seenAt ?? new Date(); const existing = this.#participants.get(key);
    if (existing) {
      const updated = Object.freeze({ ...existing, username: input.username?.trim() || existing.username, displayName: input.displayName?.trim() || existing.displayName, avatarUrl: input.avatarUrl?.trim() || existing.avatarUrl, lastSeenAt: seenAt });
      this.#participants.set(key, updated); return updated;
    }
    const created = Object.freeze({ id: this.#createId(), environment: input.environment, connectionKey: input.connectionKey.trim(), accountIdentityReferenceId: input.accountIdentityReferenceId.trim(), providerParticipantId: input.providerParticipantId.trim(), username: input.username?.trim() || null, displayName: input.displayName?.trim() || null, avatarUrl: input.avatarUrl?.trim() || null, firstSeenAt: seenAt, lastSeenAt: seenAt });
    this.#participants.set(key, created); return created;
  }

  upsertConversation(input: MetaInstagramScope & { providerConversationKey: string; participantIdentityId: string; kind?: InstagramConversationKind }) {
    const key = conversationKey(input, input.providerConversationKey); const existing = this.#conversations.get(key);
    if (existing) {
      if (existing.participantIdentityId !== input.participantIdentityId) throw new MetaInstagramPersistenceError('INSTAGRAM_CONVERSATION_PARTICIPANT_MISMATCH');
      return existing;
    }
    const created = Object.freeze({ id: this.#createId(), environment: input.environment, connectionKey: input.connectionKey.trim(), accountIdentityReferenceId: input.accountIdentityReferenceId.trim(), providerConversationKey: input.providerConversationKey.trim(), participantIdentityId: requireText(input.participantIdentityId, 'INSTAGRAM_PARTICIPANT_IDENTITY_REQUIRED'), kind: input.kind ?? 'UNKNOWN', lastActivityAt: null, lastActivityProviderMessageId: null, lastInboundAt: null, replyWindowOpenedAt: null, replyWindowExpiresAt: null, replyWindowSourceMessageId: null, orderingVersion: 0 });
    this.#conversations.set(key, created); return created;
  }

  persistInbound(input: MetaInstagramScope & { receiptId: string; providerConversationKey: string; participantIdentityId: string; providerMessageId: string; payloadDigest: string; occurredAt: Date; replyWindowMs: number; commentId?: string | null; privateReplyWindowMs?: number; kind?: InstagramConversationKind }) {
    const conversation = this.upsertConversation(input);
    const mKey = messageKey(input, input.providerMessageId); const existing = this.#messages.get(mKey);
    let message: InstagramMessageRecord;
    let created = false;
    if (existing) {
      if (existing.conversationId !== conversation.id) throw new MetaInstagramPersistenceError('INSTAGRAM_MESSAGE_CONVERSATION_MISMATCH');
      if (existing.payloadDigest && existing.payloadDigest !== input.payloadDigest) {
        message = Object.freeze({ ...existing, digestMismatchCount: existing.digestMismatchCount + 1, lastDigestMismatchAt: new Date() });
        this.#messages.set(mKey, message);
      } else message = existing;
    } else {
      created = true;
      message = Object.freeze({ id: this.#createId(), environment: input.environment, connectionKey: input.connectionKey.trim(), accountIdentityReferenceId: input.accountIdentityReferenceId.trim(), conversationId: conversation.id, providerMessageId: input.providerMessageId.trim(), localMessageKey: buildInstagramLocalMessageKey({ ...input, seed: `inbound:${input.providerMessageId}` }), direction: 'INBOUND', payloadDigest: input.payloadDigest, digestMismatchCount: 0, lastDigestMismatchAt: null, providerOccurredAt: input.occurredAt, providerStatus: 'NOT_APPLICABLE', privateReplyExpiresAt: input.commentId && input.privateReplyWindowMs ? new Date(input.occurredAt.getTime() + input.privateReplyWindowMs) : null, commentId: input.commentId ?? null });
      this.#messages.set(mKey, message);
    }
    const previousLink = this.#receiptLinks.get(input.receiptId);
    if (previousLink && previousLink !== message.id) throw new MetaInstagramPersistenceError('INSTAGRAM_RECEIPT_MESSAGE_LINK_CONFLICT');
    this.#receiptLinks.set(input.receiptId, message.id);
    if (created && compareInstagramActivity(input.occurredAt, input.providerMessageId, conversation.lastActivityAt, conversation.lastActivityProviderMessageId) > 0) {
      const advanced = Object.freeze({ ...conversation, lastActivityAt: input.occurredAt, lastActivityProviderMessageId: input.providerMessageId, lastInboundAt: input.occurredAt, replyWindowOpenedAt: input.occurredAt, replyWindowExpiresAt: new Date(input.occurredAt.getTime() + input.replyWindowMs), replyWindowSourceMessageId: message.id, orderingVersion: conversation.orderingVersion + 1 });
      this.#conversations.set(conversationKey(input, input.providerConversationKey), advanced);
      return { created, message, conversation: advanced, digestMatches: message.digestMismatchCount === 0 };
    }
    return { created, message, conversation: this.#conversations.get(conversationKey(input, input.providerConversationKey))!, digestMatches: existing?.payloadDigest === input.payloadDigest || !existing };
  }

  getReceiptMessage(receiptId: string) { return this.#receiptLinks.get(receiptId) ?? null; }
  snapshot() { return { participants: [...this.#participants.values()], conversations: [...this.#conversations.values()], messages: [...this.#messages.values()], receiptLinks: [...this.#receiptLinks.entries()] }; }
}
