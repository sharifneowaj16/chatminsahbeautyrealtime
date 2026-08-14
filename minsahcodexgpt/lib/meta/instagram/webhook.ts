import { createHash } from 'node:crypto';
import {
  parseAndNormalizeMetaWebhookNotifications,
  type MetaWebhookNotification,
} from '@/lib/meta-platform/transports/webhook';
import { normalizeInstagramAttachmentType } from './attachments';
import type { InstagramAttachmentInput, InstagramMessageType, NormalizedInstagramEvent } from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, max = 4_000): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean.slice(0, max) : null;
}
function id(value: unknown): string | null {
  const clean = text(value, 256);
  return clean && /^[A-Za-z0-9._:-]+$/.test(clean) ? clean : null;
}
function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
function correlation(eventKey: string) { return `ig:${digest(eventKey).slice(0, 24)}`; }

function attachmentsFromMessage(message: Record<string, unknown>): InstagramAttachmentInput[] {
  return array(message.attachments).slice(0, 10).map((raw, index) => {
    const item = record(raw); const payload = record(item.payload);
    return {
      externalId: id(item.id) ?? `attachment-${index}`,
      type: normalizeInstagramAttachmentType(item.type),
      url: text(payload.url, 2_000),
      mimeType: text(item.mime_type, 160),
      fileName: text(item.name, 160),
      fileSize: Number.isFinite(Number(item.size)) ? Number(item.size) : null,
      thumbnailUrl: text(payload.thumbnail_url, 2_000),
    };
  });
}

function normalizeMessagingEvent(input: {
  objectType: string;
  accountId: string;
  raw: Record<string, unknown>;
  occurredAt: string | null;
  payloadDigest: string;
}): NormalizedInstagramEvent | null {
  const sender = record(input.raw.sender); const recipient = record(input.raw.recipient);
  const senderId = id(sender.id); const recipientId = id(recipient.id);
  const message = record(input.raw.message); const postback = record(input.raw.postback);
  const platformMessageId = id(message.mid) ?? id(postback.mid);
  if (!senderId || !recipientId || !platformMessageId || !input.occurredAt) return null;
  const isEcho = message.is_echo === true || senderId === input.accountId;
  const participantId = isEcho ? recipientId : senderId;
  const rawAttachments = attachmentsFromMessage(message);
  const replyTo = record(message.reply_to); const story = record(replyTo.story);
  let messageType: InstagramMessageType = 'TEXT';
  if (text(postback.payload)) messageType = 'POSTBACK';
  else if (id(story.id) || text(story.url)) messageType = 'STORY_REPLY';
  else if (rawAttachments[0]) messageType = rawAttachments[0].type;
  const eventKey = `message:${input.accountId}:${platformMessageId}`;
  return Object.freeze({
    eventKey,
    eventType: 'MESSAGE',
    objectType: input.objectType,
    accountId: input.accountId,
    senderId,
    recipientId,
    conversationKey: `ig:${input.accountId}:${participantId}`,
    platformMessageId,
    direction: isEcho ? 'OUTBOUND' : 'INBOUND',
    messageType,
    text: text(message.text) ?? text(postback.title) ?? text(postback.payload),
    sentAt: input.occurredAt,
    replyToMessageId: id(replyTo.mid),
    storyMediaId: id(story.id),
    attachments: rawAttachments,
    correlationId: correlation(eventKey),
    payloadDigest: input.payloadDigest,
  });
}

function normalizeCommentChange(input: {
  objectType: string;
  accountId: string;
  raw: Record<string, unknown>;
  occurredAt: string | null;
  payloadDigest: string;
}): NormalizedInstagramEvent | null {
  const value = record(input.raw.value);
  const commentId = id(value.id) ?? id(value.comment_id);
  const from = record(value.from);
  const senderId = id(from.id);
  if (!commentId || !senderId || !input.occurredAt) return null;
  const media = record(value.media);
  const postId = id(media.id) ?? id(value.media_id);
  const eventKey = `comment:${input.accountId}:${commentId}`;
  return Object.freeze({
    eventKey,
    eventType: 'COMMENT',
    objectType: input.objectType,
    accountId: input.accountId,
    senderId,
    recipientId: input.accountId,
    conversationKey: `ig-comment:${input.accountId}:${commentId}`,
    platformMessageId: `comment:${commentId}`,
    direction: 'INBOUND',
    messageType: 'COMMENT_PRIVATE_REPLY',
    text: text(value.text),
    sentAt: input.occurredAt,
    commentId,
    postId,
    participantUsername: text(from.username, 160),
    participantName: text(from.name, 160),
    attachments: [],
    correlationId: correlation(eventKey),
    payloadDigest: input.payloadDigest,
  });
}

export function normalizeInstagramWebhookEvents(events: readonly MetaWebhookNotification[]): NormalizedInstagramEvent[] {
  const normalized: NormalizedInstagramEvent[] = [];
  for (const event of events) {
    if (event.routingTarget !== 'INSTAGRAM') continue;
    const accountId = id(event.objectId);
    if (!accountId) continue;
    if (event.eventKind === 'MESSAGE') {
      const item = normalizeMessagingEvent({
        objectType: event.objectType,
        accountId,
        raw: record(event.payload),
        occurredAt: event.occurredAt,
        payloadDigest: event.payloadDigest,
      });
      if (item) normalized.push(item);
      continue;
    }
    if (event.eventKind === 'COMMENT') {
      const item = normalizeCommentChange({
        objectType: event.objectType,
        accountId,
        raw: record(event.payload),
        occurredAt: event.occurredAt,
        payloadDigest: event.payloadDigest,
      });
      if (item) normalized.push(item);
    }
  }
  return normalized;
}

export function normalizeInstagramWebhookPayload(payload: unknown, payloadDigest: string): NormalizedInstagramEvent[] {
  const parsed = parseAndNormalizeMetaWebhookNotifications({ rawBody: JSON.stringify(payload) });
  const events = parsed.notifications.map((event) => Object.freeze({ ...event, payloadDigest }));
  return normalizeInstagramWebhookEvents(events);
}

export function instagramWebhookPayloadDigest(rawBody: string | Buffer) {
  return createHash('sha256').update(rawBody).digest('hex');
}
