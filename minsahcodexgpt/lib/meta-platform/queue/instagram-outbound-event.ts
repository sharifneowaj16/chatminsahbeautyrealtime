import { createHash } from 'node:crypto';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{2,95}$/;

export const META_INSTAGRAM_OUTBOUND_REALTIME_STATES = Object.freeze([
  'QUEUED',
  'RETRYING',
  'SENT',
  'BLOCKED',
  'FAILED',
  'UNKNOWN_OUTCOME',
] as const);

export type MetaInstagramOutboundRealtimeState = typeof META_INSTAGRAM_OUTBOUND_REALTIME_STATES[number];

export type MetaInstagramOutboundRealtimeEvent = Readonly<{
  schemaVersion: 1;
  type: 'INSTAGRAM_REPLY_STATE_CHANGED';
  eventId: string;
  attemptId: string;
  conversationId: string;
  messageId: string;
  correlationId: string;
  mode: 'MESSAGE' | 'PRIVATE_REPLY';
  state: MetaInstagramOutboundRealtimeState;
  providerMessageId?: string;
  reasonCode?: string;
  occurredAt: string;
  emittedAt: string;
}>;

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) throw new TypeError(code);
  return value;
}

function optionalId(value: unknown, code: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredId(value, code);
}

function optionalReason(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !SAFE_REASON_PATTERN.test(value)) {
    throw new TypeError('INSTAGRAM_OUTBOUND_REALTIME_REASON_INVALID');
  }
  return value;
}

function iso(value: Date | string, code: string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new TypeError(code);
  return parsed.toISOString();
}

export function createMetaInstagramOutboundRealtimeEvent(input: {
  attemptId: string;
  conversationId: string;
  messageId: string;
  correlationId: string;
  mode: 'MESSAGE' | 'PRIVATE_REPLY';
  state: MetaInstagramOutboundRealtimeState;
  providerMessageId?: string | null;
  reasonCode?: string | null;
  occurredAt: Date | string;
  emittedAt?: Date | string;
}): MetaInstagramOutboundRealtimeEvent {
  const attemptId = requiredId(input.attemptId, 'INSTAGRAM_OUTBOUND_REALTIME_ATTEMPT_ID_INVALID');
  const conversationId = requiredId(input.conversationId, 'INSTAGRAM_OUTBOUND_REALTIME_CONVERSATION_ID_INVALID');
  const messageId = requiredId(input.messageId, 'INSTAGRAM_OUTBOUND_REALTIME_MESSAGE_ID_INVALID');
  const correlationId = requiredId(input.correlationId, 'INSTAGRAM_OUTBOUND_REALTIME_CORRELATION_ID_INVALID');
  if (!META_INSTAGRAM_OUTBOUND_REALTIME_STATES.includes(input.state)) {
    throw new TypeError('INSTAGRAM_OUTBOUND_REALTIME_STATE_INVALID');
  }
  const occurredAt = iso(input.occurredAt, 'INSTAGRAM_OUTBOUND_REALTIME_OCCURRED_AT_INVALID');
  const emittedAt = iso(input.emittedAt ?? new Date(), 'INSTAGRAM_OUTBOUND_REALTIME_EMITTED_AT_INVALID');
  const providerMessageId = optionalId(input.providerMessageId, 'INSTAGRAM_OUTBOUND_REALTIME_PROVIDER_MESSAGE_ID_INVALID');
  const reasonCode = optionalReason(input.reasonCode);
  const eventId = `ig-reply:${createHash('sha256')
    .update(`${attemptId}\0${input.state}\0${providerMessageId ?? ''}\0${reasonCode ?? ''}`)
    .digest('hex')}`;
  return Object.freeze({
    schemaVersion: 1 as const,
    type: 'INSTAGRAM_REPLY_STATE_CHANGED' as const,
    eventId,
    attemptId,
    conversationId,
    messageId,
    correlationId,
    mode: input.mode,
    state: input.state,
    ...(providerMessageId ? { providerMessageId } : {}),
    ...(reasonCode ? { reasonCode } : {}),
    occurredAt,
    emittedAt,
  });
}
