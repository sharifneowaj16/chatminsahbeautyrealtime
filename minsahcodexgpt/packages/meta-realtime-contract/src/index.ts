import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SOCIAL_REALTIME_SCHEMA_VERSION = 1 as const;
export const SOCIAL_REALTIME_CHANNEL = 'social-updates' as const;
export const SOCIAL_REALTIME_PROTOCOL = 'minsah-inbox-v1' as const;

export const SOCIAL_REALTIME_EVENT_TYPES = Object.freeze([
  'FACEBOOK_MESSAGE_UPSERTED',
  'FACEBOOK_COMMENT_UPSERTED',
  'FACEBOOK_RECEIPT_UPDATED',
  'FACEBOOK_REPLY_STATE_CHANGED',
  'INSTAGRAM_MESSAGE_UPSERTED',
  'INSTAGRAM_REPLY_STATE_CHANGED',
  'SOCIAL_CONVERSATION_READ',
  'SOCIAL_ATTACHMENT_STATE_CHANGED',
  'META_CONNECTION_HEALTH_CHANGED',
] as const);

export type SocialRealtimeEventType = (typeof SOCIAL_REALTIME_EVENT_TYPES)[number];
export type SocialRealtimePlatform = 'facebook' | 'instagram' | 'meta';

export type SocialRealtimeEvent = Readonly<{
  schemaVersion: typeof SOCIAL_REALTIME_SCHEMA_VERSION;
  type: SocialRealtimeEventType;
  eventId: string;
  correlationId: string;
  platform: SocialRealtimePlatform;
  occurredAt: string;
  emittedAt: string;
  orderingKey: string;
  receiptId: string | null;
  conversationId: string | null;
  messageId: string | null;
  providerEventKey: string | null;
  state: string | null;
  reasonCode: string | null;
  deduplicated: boolean;
  outOfOrder: boolean;
}>;

export type SocialRealtimeEventInput = Readonly<{
  type: SocialRealtimeEventType;
  eventId?: string;
  correlationId: string;
  platform?: SocialRealtimePlatform;
  occurredAt?: Date | string;
  emittedAt?: Date | string;
  orderingKey?: string;
  receiptId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  providerEventKey?: string | null;
  state?: string | null;
  reasonCode?: string | null;
  deduplicated?: boolean;
  outOfOrder?: boolean;
}>;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,95}$/;
const FORBIDDEN_KEYS = new Set([
  'text', 'message', 'messagetext', 'rawpayload', 'payload', 'sendername', 'name',
  'email', 'phone', 'mobile', 'token', 'accesstoken', 'authorization', 'cookie',
  'url', 'attachmenturl', 'mediaurl', 'signedurl', 'body', 'secret', 'password',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[-_\s]/g, '');
}

function hasForbiddenField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) =>
    FORBIDDEN_KEYS.has(normalizedKey(key)) || hasForbiddenField(nested));
}

function requiredId(value: unknown): string | null {
  return typeof value === 'string' && SAFE_ID.test(value) ? value : null;
}

function optionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requiredId(value);
}

function iso(value: unknown): string | null {
  const parsed = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function platformFor(type: SocialRealtimeEventType, value: unknown): SocialRealtimePlatform | null {
  if (value === 'facebook' || value === 'instagram' || value === 'meta') return value;
  if (type.startsWith('FACEBOOK_')) return 'facebook';
  if (type.startsWith('INSTAGRAM_')) return 'instagram';
  if (type.startsWith('META_')) return 'meta';
  if (type.startsWith('SOCIAL_')) return null;
  return null;
}

function safeCode(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'string' && SAFE_CODE.test(value) ? value : null;
}

function eventHash(input: SocialRealtimeEventInput, occurredAt: string): string {
  return createHash('sha256').update([
    input.type,
    input.correlationId,
    input.receiptId ?? '',
    input.conversationId ?? '',
    input.messageId ?? '',
    input.providerEventKey ?? '',
    input.state ?? '',
    occurredAt,
  ].join('\0')).digest('hex');
}

export function createSocialRealtimeEvent(input: SocialRealtimeEventInput): SocialRealtimeEvent {
  const occurredAt = iso(input.occurredAt ?? new Date());
  const emittedAt = iso(input.emittedAt ?? new Date());
  if (!occurredAt || !emittedAt) throw new TypeError('SOCIAL_REALTIME_TIMESTAMP_INVALID');
  const eventId = input.eventId ?? `${input.type.toLowerCase()}:${eventHash(input, occurredAt)}`;
  const candidate = {
    schemaVersion: SOCIAL_REALTIME_SCHEMA_VERSION,
    type: input.type,
    eventId,
    correlationId: input.correlationId,
    platform: input.platform,
    occurredAt,
    emittedAt,
    orderingKey: input.orderingKey,
    receiptId: input.receiptId ?? null,
    conversationId: input.conversationId ?? null,
    messageId: input.messageId ?? null,
    providerEventKey: input.providerEventKey ?? null,
    state: input.state ?? null,
    reasonCode: input.reasonCode ?? null,
    deduplicated: input.deduplicated === true,
    outOfOrder: input.outOfOrder === true,
  };
  const parsed = parseSocialRealtimeEvent(candidate);
  if (!parsed) throw new TypeError('SOCIAL_REALTIME_EVENT_INVALID');
  return parsed;
}

export function parseSocialRealtimeEvent(value: unknown): SocialRealtimeEvent | null {
  if (!isRecord(value) || hasForbiddenField(value)) return null;
  if (value.schemaVersion !== SOCIAL_REALTIME_SCHEMA_VERSION) return null;
  if (typeof value.type !== 'string' || !SOCIAL_REALTIME_EVENT_TYPES.includes(value.type as SocialRealtimeEventType)) return null;
  const type = value.type as SocialRealtimeEventType;
  const inferredPlatform = platformFor(type, value.platform);
  const platform = inferredPlatform ?? (value.platform === 'facebook' || value.platform === 'instagram' || value.platform === 'meta' ? value.platform : null);
  if (!platform) return null;
  const eventId = requiredId(value.eventId);
  const correlationId = requiredId(value.correlationId);
  const occurredAt = iso(value.occurredAt);
  const emittedAt = iso(value.emittedAt);
  if (!eventId || !correlationId || !occurredAt || !emittedAt) return null;

  const receiptId = optionalId(value.receiptId);
  const conversationId = optionalId(value.conversationId);
  const messageId = optionalId(value.messageId);
  const providerEventKey = optionalId(value.providerEventKey ?? value.providerMessageId ?? value.attemptId);
  const orderingKey = requiredId(value.orderingKey ?? conversationId ?? receiptId ?? providerEventKey ?? eventId);
  if (!orderingKey) return null;

  const state = safeCode(value.state ?? value.direction ?? value.messageType);
  const reasonCode = safeCode(value.reasonCode);
  return Object.freeze({
    schemaVersion: SOCIAL_REALTIME_SCHEMA_VERSION,
    type,
    eventId,
    correlationId,
    platform,
    occurredAt,
    emittedAt,
    orderingKey,
    receiptId,
    conversationId,
    messageId,
    providerEventKey,
    state,
    reasonCode,
    deduplicated: value.deduplicated === true,
    outOfOrder: value.outOfOrder === true,
  });
}

export function isSocialRealtimeEvent(value: unknown): value is SocialRealtimeEvent {
  return parseSocialRealtimeEvent(value) !== null;
}


function bridgeBodyDigest(body: Buffer | string): string {
  return createHash('sha256').update(body).digest('hex');
}

function bridgeCanonical(input: { timestamp: string; method: string; path: string; body: Buffer | string }): string {
  return `${input.timestamp}\n${input.method.toUpperCase()}\n${input.path}\n${bridgeBodyDigest(input.body)}`;
}

export function createRealtimeBridgeSignature(input: {
  secret: string;
  timestamp: string;
  method: string;
  path: string;
  body: Buffer | string;
}): string {
  if (input.secret.length < 32 || !/^\d{13}$/.test(input.timestamp) || !input.path.startsWith('/')) {
    throw new TypeError('REALTIME_BRIDGE_SIGNATURE_INPUT_INVALID');
  }
  return `sha256=${createHmac('sha256', input.secret).update(bridgeCanonical(input)).digest('hex')}`;
}

export function verifyRealtimeBridgeSignature(input: {
  secret: string;
  timestamp?: string | null;
  signature?: string | null;
  method: string;
  path: string;
  body: Buffer | string;
  now?: number;
  maxSkewMs?: number;
}): boolean {
  const timestamp = input.timestamp ?? '';
  const signature = input.signature ?? '';
  if (input.secret.length < 32 || !/^\d{13}$/.test(timestamp) || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || Math.abs((input.now ?? Date.now()) - parsed) > (input.maxSkewMs ?? 60_000)) return false;
  let expected: string;
  try {
    expected = createRealtimeBridgeSignature({
      secret: input.secret,
      timestamp,
      method: input.method,
      path: input.path,
      body: input.body,
    });
  } catch {
    return false;
  }
  const left = Buffer.from(signature.toLowerCase(), 'utf8');
  const right = Buffer.from(expected.toLowerCase(), 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
