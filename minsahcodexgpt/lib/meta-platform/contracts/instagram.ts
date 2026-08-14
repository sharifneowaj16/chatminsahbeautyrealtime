import {
  createMetaPageAccountBinding,
  type CreateMetaPageAccountBindingInput,
  type MetaInstagramAccountIdentity,
  type MetaPageIdentity,
} from './pages.ts';

export const META_INSTAGRAM_CONVERSATION_SCHEMA_VERSION = 1 as const;
export const META_INSTAGRAM_MESSAGE_SCHEMA_VERSION = 1 as const;
export const META_INSTAGRAM_TEXT_MAX_LENGTH = 4_000;
export const META_INSTAGRAM_ATTACHMENT_LIMIT = 10;
export const META_INSTAGRAM_ATTACHMENT_URL_MAX_LENGTH = 2_000;
export const META_INSTAGRAM_ATTACHMENT_FILE_NAME_MAX_LENGTH = 255;

export const META_INSTAGRAM_CONVERSATION_STATUSES = [
  'OPEN',
  'PENDING',
  'RESOLVED',
  'SPAM',
  'ARCHIVED',
] as const;

export const META_INSTAGRAM_EVENT_TYPES = ['MESSAGE', 'COMMENT'] as const;
export const META_INSTAGRAM_MESSAGE_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export const META_INSTAGRAM_MESSAGE_TYPES = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'FILE',
  'STORY_REPLY',
  'COMMENT_PRIVATE_REPLY',
  'POSTBACK',
  'UNKNOWN',
] as const;
export const META_INSTAGRAM_ATTACHMENT_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'UNKNOWN'] as const;

export type MetaInstagramConversationStatus = (typeof META_INSTAGRAM_CONVERSATION_STATUSES)[number];
export type MetaInstagramEventType = (typeof META_INSTAGRAM_EVENT_TYPES)[number];
export type MetaInstagramMessageDirection = (typeof META_INSTAGRAM_MESSAGE_DIRECTIONS)[number];
export type MetaInstagramMessageType = (typeof META_INSTAGRAM_MESSAGE_TYPES)[number];
export type MetaInstagramAttachmentType = (typeof META_INSTAGRAM_ATTACHMENT_TYPES)[number];

export interface MetaInstagramParticipant {
  readonly providerId: string;
  readonly participantKey: string;
  readonly username: string | null;
  readonly displayName: string | null;
}

export interface MetaInstagramAttachmentInput {
  readonly externalId?: unknown;
  readonly type?: unknown;
  readonly url?: unknown;
  readonly mimeType?: unknown;
  readonly fileName?: unknown;
  readonly fileSize?: unknown;
  readonly thumbnailUrl?: unknown;
}

export interface MetaNormalizedInstagramAttachment {
  readonly attachmentKey: string;
  readonly externalId: string | null;
  readonly type: MetaInstagramAttachmentType;
  readonly url: string | null;
  readonly mimeType: string | null;
  readonly fileName: string | null;
  readonly fileSize: number | null;
  readonly thumbnailUrl: string | null;
}

export interface MetaNormalizedInstagramConversation {
  readonly schemaVersion: typeof META_INSTAGRAM_CONVERSATION_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly channel: 'INSTAGRAM';
  readonly conversationKey: string;
  readonly providerConversationId: string | null;
  readonly page: MetaPageIdentity;
  readonly account: MetaInstagramAccountIdentity;
  readonly participant: MetaInstagramParticipant;
  readonly status: MetaInstagramConversationStatus;
  readonly lastMessageAt: string | null;
  readonly lastInboundAt: string | null;
  readonly replyWindowExpiresAt: string | null;
  readonly privateReplyExpiresAt: string | null;
  readonly privateReplySentAt: string | null;
}

export interface MetaNormalizedInstagramMessage {
  readonly schemaVersion: typeof META_INSTAGRAM_MESSAGE_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly channel: 'INSTAGRAM';
  readonly messageKey: string;
  readonly conversationKey: string;
  readonly sourceEventKey: string | null;
  readonly sourcePayloadDigest: string | null;
  readonly eventType: MetaInstagramEventType;
  readonly page: MetaPageIdentity;
  readonly account: MetaInstagramAccountIdentity;
  readonly participant: MetaInstagramParticipant;
  readonly providerMessageId: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly direction: MetaInstagramMessageDirection;
  readonly messageType: MetaInstagramMessageType;
  readonly text: string | null;
  readonly sentAt: string;
  readonly replyToProviderMessageId: string | null;
  readonly storyMediaId: string | null;
  readonly commentId: string | null;
  readonly postId: string | null;
  readonly attachments: readonly MetaNormalizedInstagramAttachment[];
}

export interface MetaInstagramParticipantInput {
  readonly providerId: unknown;
  readonly username?: unknown;
  readonly displayName?: unknown;
}

export interface CreateMetaInstagramConversationInput {
  readonly binding: CreateMetaPageAccountBindingInput & {
    readonly instagramAccount: NonNullable<CreateMetaPageAccountBindingInput['instagramAccount']>;
  };
  readonly participant: MetaInstagramParticipantInput;
  readonly providerConversationId?: unknown;
  readonly status?: unknown;
  readonly lastMessageAt?: unknown;
  readonly lastInboundAt?: unknown;
  readonly replyWindowExpiresAt?: unknown;
  readonly privateReplyExpiresAt?: unknown;
  readonly privateReplySentAt?: unknown;
}

export interface CreateMetaInstagramMessageInput {
  readonly binding: CreateMetaInstagramConversationInput['binding'];
  readonly participant: MetaInstagramParticipantInput;
  readonly providerMessageId: unknown;
  readonly sourceEventKey?: unknown;
  readonly sourcePayloadDigest?: unknown;
  readonly eventType: unknown;
  readonly senderId: unknown;
  readonly recipientId: unknown;
  readonly direction: unknown;
  readonly messageType: unknown;
  readonly text?: unknown;
  readonly sentAt: unknown;
  readonly replyToProviderMessageId?: unknown;
  readonly storyMediaId?: unknown;
  readonly commentId?: unknown;
  readonly postId?: unknown;
  readonly attachments?: unknown;
}

type InstagramContext = {
  readonly page: MetaPageIdentity;
  readonly account: MetaInstagramAccountIdentity;
  readonly participant: MetaInstagramParticipant;
  readonly conversationKey: string;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown, code: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new TypeError(code);
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > maxLength) throw new TypeError(code);
  return normalized;
}

function requiredString(value: unknown, code: string, maxLength = 255): string {
  const normalized = cleanString(value, code, maxLength);
  if (!normalized) throw new TypeError(code);
  return normalized;
}

function providerId(value: unknown, code: string): string {
  const normalized = requiredString(value, code, 255);
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) throw new TypeError(code);
  return normalized;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], code: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new TypeError(code);
  return value as T;
}

function dateValue(value: unknown, code: string, required = false): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) throw new TypeError(code);
    return null;
  }
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value < 1_000_000_000_000 ? value * 1_000 : value);
  } else if (typeof value === 'string') {
    const normalized = value.trim();
    const numeric = /^\d{10,13}$/.test(normalized) ? Number(normalized) : null;
    date = numeric === null
      ? new Date(normalized)
      : new Date(numeric < 1_000_000_000_000 ? numeric * 1_000 : numeric);
  } else {
    throw new TypeError(code);
  }
  if (Number.isNaN(date.getTime())) throw new TypeError(code);
  return date.toISOString();
}

function payloadDigest(value: unknown): string | null {
  const normalized = cleanString(value, 'META_INSTAGRAM_PAYLOAD_DIGEST_INVALID', 64);
  if (normalized === null) return null;
  if (!/^[a-f0-9]{64}$/i.test(normalized)) throw new TypeError('META_INSTAGRAM_PAYLOAD_DIGEST_INVALID');
  return normalized.toLowerCase();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function createInstagramContext(input: {
  readonly binding: CreateMetaInstagramConversationInput['binding'];
  readonly participant: MetaInstagramParticipantInput;
}): InstagramContext {
  const binding = createMetaPageAccountBinding(input.binding);
  if (!binding.instagramAccount) throw new TypeError('META_INSTAGRAM_ACCOUNT_REQUIRED');
  const participantId = providerId(input.participant.providerId, 'META_INSTAGRAM_PARTICIPANT_ID_INVALID');
  if (participantId === binding.instagramAccount.providerId) {
    throw new TypeError('META_INSTAGRAM_PARTICIPANT_ACCOUNT_COLLISION');
  }
  const participant = Object.freeze({
    providerId: participantId,
    participantKey: `${binding.instagramAccount.identityKey}:PARTICIPANT:${participantId}`,
    username: cleanString(input.participant.username, 'META_INSTAGRAM_PARTICIPANT_USERNAME_INVALID', 160),
    displayName: cleanString(input.participant.displayName, 'META_INSTAGRAM_PARTICIPANT_NAME_INVALID', 255),
  });
  return Object.freeze({
    page: binding.page,
    account: binding.instagramAccount,
    participant,
    conversationKey: `${binding.instagramAccount.identityKey}:CONVERSATION:${participantId}`,
  });
}

function normalizeAttachments(value: unknown, messageKey: string): readonly MetaNormalizedInstagramAttachment[] {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError('META_INSTAGRAM_ATTACHMENTS_INVALID');
  if (value.length > META_INSTAGRAM_ATTACHMENT_LIMIT) throw new TypeError('META_INSTAGRAM_ATTACHMENT_LIMIT_EXCEEDED');

  const externalIds = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    if (!isRecord(candidate)) throw new TypeError('META_INSTAGRAM_ATTACHMENT_INVALID');
    const externalId = cleanString(candidate.externalId, 'META_INSTAGRAM_ATTACHMENT_ID_INVALID', 255);
    if (externalId && externalIds.has(externalId)) throw new TypeError('META_INSTAGRAM_ATTACHMENT_ID_DUPLICATE');
    if (externalId) externalIds.add(externalId);
    const type = enumValue(candidate.type ?? 'UNKNOWN', META_INSTAGRAM_ATTACHMENT_TYPES, 'META_INSTAGRAM_ATTACHMENT_TYPE_INVALID');
    const fileSize = candidate.fileSize === undefined || candidate.fileSize === null
      ? null
      : Number(candidate.fileSize);
    if (fileSize !== null && (!Number.isSafeInteger(fileSize) || fileSize < 0)) {
      throw new TypeError('META_INSTAGRAM_ATTACHMENT_SIZE_INVALID');
    }
    return Object.freeze({
      attachmentKey: `${messageKey}:ATTACHMENT:${externalId ?? index}`,
      externalId,
      type,
      url: cleanString(candidate.url, 'META_INSTAGRAM_ATTACHMENT_URL_INVALID', META_INSTAGRAM_ATTACHMENT_URL_MAX_LENGTH),
      mimeType: cleanString(candidate.mimeType, 'META_INSTAGRAM_ATTACHMENT_MIME_INVALID', 160)?.toLowerCase() ?? null,
      fileName: cleanString(candidate.fileName, 'META_INSTAGRAM_ATTACHMENT_FILE_NAME_INVALID', META_INSTAGRAM_ATTACHMENT_FILE_NAME_MAX_LENGTH),
      fileSize,
      thumbnailUrl: cleanString(candidate.thumbnailUrl, 'META_INSTAGRAM_ATTACHMENT_THUMBNAIL_INVALID', META_INSTAGRAM_ATTACHMENT_URL_MAX_LENGTH),
    });
  }));
}

export function createMetaInstagramConversation(
  input: CreateMetaInstagramConversationInput,
): MetaNormalizedInstagramConversation {
  const context = createInstagramContext(input);
  return Object.freeze({
    schemaVersion: META_INSTAGRAM_CONVERSATION_SCHEMA_VERSION,
    provider: 'META' as const,
    channel: 'INSTAGRAM' as const,
    conversationKey: context.conversationKey,
    providerConversationId: cleanString(input.providerConversationId, 'META_INSTAGRAM_CONVERSATION_ID_INVALID', 255),
    page: context.page,
    account: context.account,
    participant: context.participant,
    status: input.status === undefined
      ? 'OPEN'
      : enumValue(input.status, META_INSTAGRAM_CONVERSATION_STATUSES, 'META_INSTAGRAM_CONVERSATION_STATUS_INVALID'),
    lastMessageAt: dateValue(input.lastMessageAt, 'META_INSTAGRAM_LAST_MESSAGE_AT_INVALID'),
    lastInboundAt: dateValue(input.lastInboundAt, 'META_INSTAGRAM_LAST_INBOUND_AT_INVALID'),
    replyWindowExpiresAt: dateValue(input.replyWindowExpiresAt, 'META_INSTAGRAM_REPLY_WINDOW_INVALID'),
    privateReplyExpiresAt: dateValue(input.privateReplyExpiresAt, 'META_INSTAGRAM_PRIVATE_REPLY_WINDOW_INVALID'),
    privateReplySentAt: dateValue(input.privateReplySentAt, 'META_INSTAGRAM_PRIVATE_REPLY_SENT_AT_INVALID'),
  });
}

export function createMetaInstagramMessage(input: CreateMetaInstagramMessageInput): MetaNormalizedInstagramMessage {
  const context = createInstagramContext(input);
  const providerMessageId = providerId(input.providerMessageId, 'META_INSTAGRAM_MESSAGE_ID_INVALID');
  const direction = enumValue(input.direction, META_INSTAGRAM_MESSAGE_DIRECTIONS, 'META_INSTAGRAM_DIRECTION_INVALID');
  const senderId = providerId(input.senderId, 'META_INSTAGRAM_SENDER_ID_INVALID');
  const recipientId = providerId(input.recipientId, 'META_INSTAGRAM_RECIPIENT_ID_INVALID');
  const expectedSenderId = direction === 'INBOUND' ? context.participant.providerId : context.account.providerId;
  const expectedRecipientId = direction === 'INBOUND' ? context.account.providerId : context.participant.providerId;
  if (senderId !== expectedSenderId || recipientId !== expectedRecipientId) {
    throw new TypeError('META_INSTAGRAM_DIRECTION_IDENTITY_MISMATCH');
  }

  const messageKey = `${context.conversationKey}:MESSAGE:${providerMessageId}`;
  const attachments = normalizeAttachments(input.attachments, messageKey);
  const text = cleanString(input.text, 'META_INSTAGRAM_MESSAGE_TEXT_INVALID', META_INSTAGRAM_TEXT_MAX_LENGTH);
  const commentId = cleanString(input.commentId, 'META_INSTAGRAM_COMMENT_ID_INVALID', 255);
  const storyMediaId = cleanString(input.storyMediaId, 'META_INSTAGRAM_STORY_MEDIA_ID_INVALID', 255);
  const messageType = enumValue(input.messageType, META_INSTAGRAM_MESSAGE_TYPES, 'META_INSTAGRAM_MESSAGE_TYPE_INVALID');
  if (!text && attachments.length === 0 && !commentId && !storyMediaId && messageType !== 'UNKNOWN') {
    throw new TypeError('META_INSTAGRAM_MESSAGE_CONTENT_REQUIRED');
  }

  const eventType = enumValue(input.eventType, META_INSTAGRAM_EVENT_TYPES, 'META_INSTAGRAM_EVENT_TYPE_INVALID');
  if (eventType === 'COMMENT' && !commentId) throw new TypeError('META_INSTAGRAM_COMMENT_ID_REQUIRED');

  return Object.freeze({
    schemaVersion: META_INSTAGRAM_MESSAGE_SCHEMA_VERSION,
    provider: 'META' as const,
    channel: 'INSTAGRAM' as const,
    messageKey,
    conversationKey: context.conversationKey,
    sourceEventKey: cleanString(input.sourceEventKey, 'META_INSTAGRAM_SOURCE_EVENT_KEY_INVALID', 512),
    sourcePayloadDigest: payloadDigest(input.sourcePayloadDigest),
    eventType,
    page: context.page,
    account: context.account,
    participant: context.participant,
    providerMessageId,
    senderId,
    recipientId,
    direction,
    messageType,
    text,
    sentAt: dateValue(input.sentAt, 'META_INSTAGRAM_SENT_AT_INVALID', true) as string,
    replyToProviderMessageId: cleanString(input.replyToProviderMessageId, 'META_INSTAGRAM_REPLY_TO_ID_INVALID', 255),
    storyMediaId,
    commentId,
    postId: cleanString(input.postId, 'META_INSTAGRAM_POST_ID_INVALID', 255),
    attachments,
  });
}

export function isMetaNormalizedInstagramConversation(value: unknown): value is MetaNormalizedInstagramConversation {
  if (!isRecord(value)) return false;
  try {
    const canonical = createMetaInstagramConversation({
      binding: {
        page: value.page as CreateMetaInstagramConversationInput['binding']['page'],
        instagramAccount: value.account as CreateMetaInstagramConversationInput['binding']['instagramAccount'],
      },
      participant: value.participant as unknown as MetaInstagramParticipantInput,
      providerConversationId: value.providerConversationId,
      status: value.status,
      lastMessageAt: value.lastMessageAt,
      lastInboundAt: value.lastInboundAt,
      replyWindowExpiresAt: value.replyWindowExpiresAt,
      privateReplyExpiresAt: value.privateReplyExpiresAt,
      privateReplySentAt: value.privateReplySentAt,
    });
    return stableStringify(canonical) === stableStringify(value);
  } catch {
    return false;
  }
}

export function isMetaNormalizedInstagramMessage(value: unknown): value is MetaNormalizedInstagramMessage {
  if (!isRecord(value)) return false;
  try {
    const canonical = createMetaInstagramMessage({
      binding: {
        page: value.page as CreateMetaInstagramMessageInput['binding']['page'],
        instagramAccount: value.account as CreateMetaInstagramMessageInput['binding']['instagramAccount'],
      },
      participant: value.participant as unknown as MetaInstagramParticipantInput,
      providerMessageId: value.providerMessageId,
      sourceEventKey: value.sourceEventKey,
      sourcePayloadDigest: value.sourcePayloadDigest,
      eventType: value.eventType,
      senderId: value.senderId,
      recipientId: value.recipientId,
      direction: value.direction,
      messageType: value.messageType,
      text: value.text,
      sentAt: value.sentAt,
      replyToProviderMessageId: value.replyToProviderMessageId,
      storyMediaId: value.storyMediaId,
      commentId: value.commentId,
      postId: value.postId,
      attachments: value.attachments,
    });
    return stableStringify(canonical) === stableStringify(value);
  } catch {
    return false;
  }
}
