import { createHash } from 'node:crypto';
import { META_NORMALIZED_WEBHOOK_SCHEMA_VERSION } from '../../contracts/webhook';
import { routeMetaWebhookEvent } from './routing';
import { digestMetaWebhookPayload } from './signature';
import type { MetaWebhookEnvelope, MetaWebhookEnvelopeEntry, MetaWebhookNotification } from './types';

export const META_WEBHOOK_MAX_ENTRIES = 100;
export const META_WEBHOOK_MAX_EVENTS_PER_GROUP = 500;
export const META_WEBHOOK_MAX_EVENTS_TOTAL = 1_000;
const META_WEBHOOK_MAX_OBJECT_TYPE_LENGTH = 80;
const META_WEBHOOK_MAX_ID_LENGTH = 256;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

function toIso(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() && !/^\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = new Date(value.trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds > 10_000_000_000 ? seconds : seconds * 1_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length > 0 && clean.length <= maxLength ? clean : null;
}

function nonEmptyString(value: unknown): string | null {
  return boundedString(value, META_WEBHOOK_MAX_ID_LENGTH);
}

function providerEventId(event: Readonly<Record<string, unknown>>): string | null {
  const message = objectValue(event.message);
  const postback = objectValue(event.postback);
  const value = objectValue(event.value);

  return nonEmptyString(event.id)
    ?? nonEmptyString(message?.mid)
    ?? nonEmptyString(postback?.mid)
    ?? nonEmptyString(value?.leadgen_id)
    ?? nonEmptyString(value?.comment_id)
    ?? nonEmptyString(value?.id);
}

function invalid(code: string): never {
  throw new Error(code);
}

function boundedEventArray(input: {
  readonly entry: Record<string, unknown>;
  readonly group: 'changes' | 'messaging' | 'standby';
}): readonly unknown[] {
  const value = input.entry[input.group];
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) invalid(`META_WEBHOOK_${input.group.toUpperCase()}_INVALID`);
  if (value.length > META_WEBHOOK_MAX_EVENTS_PER_GROUP) invalid('META_WEBHOOK_EVENT_GROUP_LIMIT_EXCEEDED');
  return Object.freeze([...value]);
}

function normalizedEnvelopeEntry(value: unknown): MetaWebhookEnvelopeEntry {
  const row = objectValue(value);
  if (!row) invalid('META_WEBHOOK_ENTRY_INVALID');
  let id: string | undefined;
  if (row.id !== undefined) {
    const normalizedId = boundedString(row.id, META_WEBHOOK_MAX_ID_LENGTH);
    if (!normalizedId) invalid('META_WEBHOOK_ENTRY_ID_INVALID');
    id = normalizedId;
  }
  const changes = boundedEventArray({ entry: row, group: 'changes' });
  const messaging = boundedEventArray({ entry: row, group: 'messaging' });
  const standby = boundedEventArray({ entry: row, group: 'standby' });
  if (changes.length + messaging.length + standby.length > META_WEBHOOK_MAX_EVENTS_TOTAL) {
    invalid('META_WEBHOOK_ENTRY_EVENT_LIMIT_EXCEEDED');
  }
  return Object.freeze({
    ...row,
    ...(id === undefined ? {} : { id }),
    changes,
    messaging,
    standby,
  });
}

export function parseMetaWebhookEnvelope(input: {
  readonly rawBody: string | Buffer;
  readonly maxBytes?: number;
  readonly expectedPayloadDigest?: string;
}): { readonly envelope: MetaWebhookEnvelope; readonly payloadDigest: string } {
  const maxBytes = Math.min(Math.max(input.maxBytes ?? 1_048_576, 1_024), 10 * 1024 * 1024);
  const bytes = Buffer.isBuffer(input.rawBody) ? input.rawBody : Buffer.from(input.rawBody, 'utf8');
  if (bytes.byteLength > maxBytes) invalid('META_WEBHOOK_PAYLOAD_TOO_LARGE');
  let parsed: unknown;
  try { parsed = JSON.parse(bytes.toString('utf8')); } catch { invalid('META_WEBHOOK_JSON_INVALID'); }
  const root = objectValue(parsed);
  if (!root || !Array.isArray(root.entry)) invalid('META_WEBHOOK_ENVELOPE_INVALID');
  const objectType = boundedString(root.object, META_WEBHOOK_MAX_OBJECT_TYPE_LENGTH)?.toLowerCase();
  if (!objectType) invalid('META_WEBHOOK_OBJECT_INVALID');
  if (root.entry.length > META_WEBHOOK_MAX_ENTRIES) invalid('META_WEBHOOK_ENTRY_LIMIT_EXCEEDED');

  const entries = root.entry.map(normalizedEnvelopeEntry);
  const totalEvents = entries.reduce((count, entry) => (
    count + (entry.changes?.length ?? 0) + (entry.messaging?.length ?? 0) + (entry.standby?.length ?? 0)
  ), 0);
  if (totalEvents > META_WEBHOOK_MAX_EVENTS_TOTAL) invalid('META_WEBHOOK_EVENT_LIMIT_EXCEEDED');

  const payloadDigest = digestMetaWebhookPayload(bytes);
  if (input.expectedPayloadDigest && input.expectedPayloadDigest !== payloadDigest) {
    invalid('META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH');
  }

  return Object.freeze({
    envelope: Object.freeze({ ...root, object: objectType, entry: Object.freeze(entries) }) as MetaWebhookEnvelope,
    payloadDigest,
  });
}

export function normalizeMetaWebhookNotifications(input: {
  readonly envelope: MetaWebhookEnvelope;
  readonly payloadDigest: string;
}): readonly MetaWebhookNotification[] {
  const notifications: MetaWebhookNotification[] = [];
  const objectType = boundedString(input.envelope.object, META_WEBHOOK_MAX_OBJECT_TYPE_LENGTH)?.toLowerCase();
  if (!objectType) invalid('META_WEBHOOK_OBJECT_INVALID');

  input.envelope.entry.forEach((entry, entryIndex) => {
    const row = objectValue(entry);
    if (!row) invalid('META_WEBHOOK_ENTRY_INVALID');
    const objectId = boundedString(row.id, META_WEBHOOK_MAX_ID_LENGTH);
    const occurredAt = toIso(row.time);
    const groups = [
      ['changes', Array.isArray(row.changes) ? row.changes : []],
      ['messaging', Array.isArray(row.messaging) ? row.messaging : []],
      ['standby', Array.isArray(row.standby) ? row.standby : []],
    ] as const;
    let eventIndex = 0;
    for (const [group, events] of groups) {
      for (const event of events) {
        const eventRow = objectValue(event);
        if (!eventRow) invalid('META_WEBHOOK_EVENT_INVALID');
        const field = group === 'changes'
          ? boundedString(eventRow.field, META_WEBHOOK_MAX_OBJECT_TYPE_LENGTH)?.toLowerCase() ?? null
          : group;
        const eventValue = objectValue(eventRow.value);
        const eventOccurredAt = toIso(
          eventRow.timestamp
          ?? eventRow.time
          ?? eventValue?.timestamp
          ?? eventValue?.created_time,
        ) ?? occurredAt;
        const senderId = objectValue(eventRow.sender)?.id;
        const recipientId = objectValue(eventRow.recipient)?.id;
        const orderingKey = objectId || nonEmptyString(senderId) || nonEmptyString(recipientId) || input.payloadDigest;
        const route = routeMetaWebhookEvent({ objectType, eventGroup: group, field });
        const fingerprint = stableStringify({ objectType, objectId, field, eventOccurredAt, eventRow });
        const eventKey = createHash('sha256').update(fingerprint).digest('hex');
        notifications.push(Object.freeze({
          schemaVersion: META_NORMALIZED_WEBHOOK_SCHEMA_VERSION,
          provider: 'META',
          transport: 'WEBHOOK',
          eventKey,
          providerEventId: providerEventId(eventRow),
          payloadDigest: input.payloadDigest,
          objectType,
          objectId,
          field,
          eventGroup: group,
          eventKind: route.eventKind,
          routingTarget: route.routingTarget,
          occurredAt: eventOccurredAt,
          orderingKey,
          entryIndex,
          eventIndex,
          payload: Object.freeze({ ...eventRow }),
        }));
        eventIndex += 1;
      }
    }
  });
  return Object.freeze(notifications.sort((a, b) => {
    const left = a.occurredAt ?? '';
    const right = b.occurredAt ?? '';
    return left.localeCompare(right) || a.entryIndex - b.entryIndex || a.eventIndex - b.eventIndex || a.eventKey.localeCompare(b.eventKey);
  }));
}

export function parseAndNormalizeMetaWebhookNotifications(input: {
  readonly rawBody: string | Buffer;
  readonly maxBytes?: number;
  readonly expectedPayloadDigest?: string;
}): {
  readonly envelope: MetaWebhookEnvelope;
  readonly payloadDigest: string;
  readonly notifications: readonly MetaWebhookNotification[];
} {
  const parsed = parseMetaWebhookEnvelope(input);
  return Object.freeze({
    ...parsed,
    notifications: normalizeMetaWebhookNotifications(parsed),
  });
}

export function selectMetaWebhookNotifications(input: {
  readonly notifications: readonly MetaWebhookNotification[];
  readonly routingTarget: MetaWebhookNotification['routingTarget'];
}): readonly MetaWebhookNotification[] {
  return Object.freeze(input.notifications.filter((event) => event.routingTarget === input.routingTarget));
}
