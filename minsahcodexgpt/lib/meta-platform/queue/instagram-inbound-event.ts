import { createHash } from 'node:crypto';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;

export type MetaInstagramInboundRealtimeEvent = Readonly<{
  schemaVersion: 1;
  type: 'INSTAGRAM_MESSAGE_UPSERTED';
  eventId: string;
  receiptId: string;
  conversationId: string;
  messageId: string;
  correlationId: string;
  providerMessageId: string;
  direction: string;
  messageType: string;
  occurredAt: string;
  emittedAt: string;
  deduplicated: boolean;
  outOfOrder: boolean;
}>;

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) throw new TypeError(code);
  return value;
}

function iso(value: Date | string, code: string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new TypeError(code);
  return parsed.toISOString();
}

export function createMetaInstagramInboundRealtimeEvent(input: {
  receiptId: string;
  conversationId: string;
  messageId: string;
  correlationId: string;
  providerMessageId: string;
  direction: string;
  messageType: string;
  occurredAt: Date | string;
  emittedAt?: Date | string;
  deduplicated: boolean;
  outOfOrder: boolean;
}): MetaInstagramInboundRealtimeEvent {
  const receiptId = requiredId(input.receiptId, 'INSTAGRAM_REALTIME_RECEIPT_ID_INVALID');
  const conversationId = requiredId(input.conversationId, 'INSTAGRAM_REALTIME_CONVERSATION_ID_INVALID');
  const messageId = requiredId(input.messageId, 'INSTAGRAM_REALTIME_MESSAGE_ID_INVALID');
  const correlationId = requiredId(input.correlationId, 'INSTAGRAM_REALTIME_CORRELATION_ID_INVALID');
  const providerMessageId = requiredId(input.providerMessageId, 'INSTAGRAM_REALTIME_PROVIDER_MESSAGE_ID_INVALID');
  const direction = requiredId(input.direction, 'INSTAGRAM_REALTIME_DIRECTION_INVALID');
  const messageType = requiredId(input.messageType, 'INSTAGRAM_REALTIME_MESSAGE_TYPE_INVALID');
  const occurredAt = iso(input.occurredAt, 'INSTAGRAM_REALTIME_OCCURRED_AT_INVALID');
  const emittedAt = iso(input.emittedAt ?? new Date(), 'INSTAGRAM_REALTIME_EMITTED_AT_INVALID');
  const eventId = `ig-message:${createHash('sha256').update(`${receiptId}\0${messageId}\0${occurredAt}`).digest('hex')}`;
  return Object.freeze({
    schemaVersion: 1 as const,
    type: 'INSTAGRAM_MESSAGE_UPSERTED' as const,
    eventId,
    receiptId,
    conversationId,
    messageId,
    correlationId,
    providerMessageId,
    direction,
    messageType,
    occurredAt,
    emittedAt,
    deduplicated: input.deduplicated,
    outOfOrder: input.outOfOrder,
  });
}
