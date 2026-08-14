import { createHash } from 'node:crypto';

import {
  createMetaInstagramConversation,
  META_INSTAGRAM_TEXT_MAX_LENGTH,
  type CreateMetaInstagramConversationInput,
  type MetaInstagramParticipant,
} from './instagram';
import type { MetaInstagramAccountIdentity, MetaPageIdentity } from './pages';

export const META_INSTAGRAM_SEND_REQUEST_SCHEMA_VERSION = 1 as const;
export const META_INSTAGRAM_SEND_MODES = ['MESSAGE', 'PRIVATE_REPLY'] as const;
export const META_INSTAGRAM_SEND_ACTOR_TYPES = ['ADMIN', 'SYSTEM', 'AUTOMATION'] as const;
export const META_INSTAGRAM_SEND_IDEMPOTENCY_KEY_MAX_LENGTH = 160;
export const META_INSTAGRAM_SEND_CORRELATION_ID_MAX_LENGTH = 255;
export const META_INSTAGRAM_SEND_SOURCE_KEY_MAX_LENGTH = 512;
export const META_INSTAGRAM_SEND_TEXT_MAX_LENGTH = META_INSTAGRAM_TEXT_MAX_LENGTH;

export type MetaInstagramSendMode = (typeof META_INSTAGRAM_SEND_MODES)[number];
export type MetaInstagramSendActorType = (typeof META_INSTAGRAM_SEND_ACTOR_TYPES)[number];

export interface MetaNormalizedInstagramSendRequest {
  readonly schemaVersion: typeof META_INSTAGRAM_SEND_REQUEST_SCHEMA_VERSION;
  readonly provider: 'META';
  readonly channel: 'INSTAGRAM';
  readonly sendKey: string;
  readonly idempotencyKey: string;
  readonly conversationKey: string;
  readonly page: MetaPageIdentity;
  readonly account: MetaInstagramAccountIdentity;
  readonly participant: MetaInstagramParticipant;
  readonly mode: MetaInstagramSendMode;
  readonly text: string;
  readonly textHash: string;
  readonly sourceMessageKey: string | null;
  readonly sourceProviderMessageId: string | null;
  readonly sourceCommentId: string | null;
  readonly sourcePostId: string | null;
  readonly requestedAt: string;
  readonly correlationId: string;
  readonly actorType: MetaInstagramSendActorType;
  readonly actorId: string | null;
}

export interface CreateMetaInstagramSendRequestInput {
  readonly binding: CreateMetaInstagramConversationInput['binding'];
  readonly participant: CreateMetaInstagramConversationInput['participant'];
  readonly idempotencyKey: unknown;
  readonly mode: unknown;
  readonly text: unknown;
  readonly sourceMessageKey?: unknown;
  readonly sourceProviderMessageId?: unknown;
  readonly sourceCommentId?: unknown;
  readonly sourcePostId?: unknown;
  readonly requestedAt: unknown;
  readonly correlationId: unknown;
  readonly actorType: unknown;
  readonly actorId?: unknown;
}

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

function requiredString(value: unknown, code: string, maxLength: number): string {
  const normalized = cleanString(value, code, maxLength);
  if (!normalized) throw new TypeError(code);
  return normalized;
}

function providerId(value: unknown, code: string): string | null {
  const normalized = cleanString(value, code, 255);
  if (normalized === null) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) throw new TypeError(code);
  return normalized;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], code: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new TypeError(code);
  return value as T;
}

function dateValue(value: unknown, code: string): string {
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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function textHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createMetaInstagramSendRequest(
  input: CreateMetaInstagramSendRequestInput,
): MetaNormalizedInstagramSendRequest {
  const conversation = createMetaInstagramConversation({
    binding: input.binding,
    participant: input.participant,
  });
  const idempotencyKey = requiredString(
    input.idempotencyKey,
    'META_INSTAGRAM_SEND_IDEMPOTENCY_KEY_INVALID',
    META_INSTAGRAM_SEND_IDEMPOTENCY_KEY_MAX_LENGTH,
  );
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(idempotencyKey)) {
    throw new TypeError('META_INSTAGRAM_SEND_IDEMPOTENCY_KEY_INVALID');
  }

  const mode = enumValue(input.mode, META_INSTAGRAM_SEND_MODES, 'META_INSTAGRAM_SEND_MODE_INVALID');
  const text = requiredString(input.text, 'META_INSTAGRAM_SEND_TEXT_INVALID', META_INSTAGRAM_SEND_TEXT_MAX_LENGTH);
  const sourceMessageKey = cleanString(
    input.sourceMessageKey,
    'META_INSTAGRAM_SEND_SOURCE_MESSAGE_KEY_INVALID',
    META_INSTAGRAM_SEND_SOURCE_KEY_MAX_LENGTH,
  );
  const sourceMessagePrefix = `${conversation.conversationKey}:MESSAGE:`;
  if (sourceMessageKey && (!sourceMessageKey.startsWith(sourceMessagePrefix) || sourceMessageKey.length === sourceMessagePrefix.length)) {
    throw new TypeError('META_INSTAGRAM_SEND_SOURCE_CONVERSATION_MISMATCH');
  }

  const sourceProviderMessageId = providerId(
    input.sourceProviderMessageId,
    'META_INSTAGRAM_SEND_SOURCE_PROVIDER_MESSAGE_ID_INVALID',
  );
  if (sourceMessageKey && sourceProviderMessageId && sourceMessageKey !== `${sourceMessagePrefix}${sourceProviderMessageId}`) {
    throw new TypeError('META_INSTAGRAM_SEND_SOURCE_PROVIDER_MESSAGE_MISMATCH');
  }
  const sourceCommentId = providerId(input.sourceCommentId, 'META_INSTAGRAM_SEND_SOURCE_COMMENT_ID_INVALID');
  const sourcePostId = providerId(input.sourcePostId, 'META_INSTAGRAM_SEND_SOURCE_POST_ID_INVALID');
  if (mode === 'PRIVATE_REPLY' && !sourceCommentId) {
    throw new TypeError('META_INSTAGRAM_SEND_PRIVATE_REPLY_COMMENT_REQUIRED');
  }

  const actorType = enumValue(
    input.actorType,
    META_INSTAGRAM_SEND_ACTOR_TYPES,
    'META_INSTAGRAM_SEND_ACTOR_TYPE_INVALID',
  );
  const actorId = cleanString(input.actorId, 'META_INSTAGRAM_SEND_ACTOR_ID_INVALID', 255);
  if (actorType === 'ADMIN' && !actorId) throw new TypeError('META_INSTAGRAM_SEND_ADMIN_ACTOR_REQUIRED');

  return Object.freeze({
    schemaVersion: META_INSTAGRAM_SEND_REQUEST_SCHEMA_VERSION,
    provider: 'META' as const,
    channel: 'INSTAGRAM' as const,
    sendKey: `${conversation.account.identityKey}:SEND:${idempotencyKey}`,
    idempotencyKey,
    conversationKey: conversation.conversationKey,
    page: conversation.page,
    account: conversation.account,
    participant: conversation.participant,
    mode,
    text,
    textHash: textHash(text),
    sourceMessageKey,
    sourceProviderMessageId,
    sourceCommentId,
    sourcePostId,
    requestedAt: dateValue(input.requestedAt, 'META_INSTAGRAM_SEND_REQUESTED_AT_INVALID'),
    correlationId: requiredString(
      input.correlationId,
      'META_INSTAGRAM_SEND_CORRELATION_ID_INVALID',
      META_INSTAGRAM_SEND_CORRELATION_ID_MAX_LENGTH,
    ),
    actorType,
    actorId,
  });
}

export function isMetaNormalizedInstagramSendRequest(
  value: unknown,
): value is MetaNormalizedInstagramSendRequest {
  if (!isRecord(value)) return false;
  try {
    const canonical = createMetaInstagramSendRequest({
      binding: {
        page: value.page as CreateMetaInstagramSendRequestInput['binding']['page'],
        instagramAccount: value.account as CreateMetaInstagramSendRequestInput['binding']['instagramAccount'],
      },
      participant: value.participant as CreateMetaInstagramSendRequestInput['participant'],
      idempotencyKey: value.idempotencyKey,
      mode: value.mode,
      text: value.text,
      sourceMessageKey: value.sourceMessageKey,
      sourceProviderMessageId: value.sourceProviderMessageId,
      sourceCommentId: value.sourceCommentId,
      sourcePostId: value.sourcePostId,
      requestedAt: value.requestedAt,
      correlationId: value.correlationId,
      actorType: value.actorType,
      actorId: value.actorId,
    });
    return stableStringify(canonical) === stableStringify(value);
  } catch {
    return false;
  }
}
