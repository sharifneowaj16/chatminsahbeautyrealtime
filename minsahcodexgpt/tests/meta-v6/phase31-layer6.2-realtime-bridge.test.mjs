import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createSocialRealtimeEvent,
  parseSocialRealtimeEvent,
  SOCIAL_REALTIME_PROTOCOL,
} from '../../packages/meta-realtime-contract/src/index.ts';
import { InMemorySocialRealtimeEventWindow } from '../../realtime-service/src/realtime/event-window.ts';

const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const event = (overrides = {}) => createSocialRealtimeEvent({
  type: 'FACEBOOK_MESSAGE_UPSERTED',
  eventId: 'event.base',
  correlationId: 'corr.base',
  platform: 'facebook',
  occurredAt: '2026-07-26T20:00:00.000Z',
  emittedAt: '2026-07-26T20:00:01.000Z',
  orderingKey: 'conversation.1',
  conversationId: 'conversation.1',
  messageId: 'message.1',
  state: 'INBOUND',
  ...overrides,
});

test('normalized contract rejects content, secrets, and URLs', () => {
  assert.equal(parseSocialRealtimeEvent({ ...event(), text: 'secret message' }), null);
  assert.equal(parseSocialRealtimeEvent({ ...event(), attachmentUrl: 'https://example.test/a' }), null);
  assert.equal(parseSocialRealtimeEvent({ ...event(), accessToken: 'token' }), null);
});

test('contract safely projects legacy-compatible producer fields', () => {
  const parsed = parseSocialRealtimeEvent({
    ...event({ type: 'INSTAGRAM_MESSAGE_UPSERTED', platform: 'instagram', eventId: 'ig.event' }),
    providerMessageId: 'provider.1',
    direction: 'INBOUND',
  });
  assert.equal(parsed?.providerEventKey, 'provider.1');
  assert.equal(parsed?.state, 'INBOUND');
  assert.equal('providerMessageId' in parsed, false);
});

test('event window suppresses duplicate IDs and flags out-of-order events', () => {
  const window = new InMemorySocialRealtimeEventWindow();
  assert.equal(window.accept(event()).accepted, true);
  assert.deepEqual(window.accept(event()), { accepted: false, reason: 'DUPLICATE_EVENT' });
  const older = window.accept(event({ eventId: 'event.older', occurredAt: '2026-07-26T19:59:00.000Z', emittedAt: '2026-07-26T20:00:02.000Z' }));
  assert.equal(older.accepted && older.delivery.event.outOfOrder, true);
});

test('bounded cursor recovery detects an evicted history gap', () => {
  const window = new InMemorySocialRealtimeEventWindow(2);
  const first = window.accept(event({ eventId: 'event.1', emittedAt: '2026-07-26T20:00:01.000Z' }));
  window.accept(event({ eventId: 'event.2', emittedAt: '2026-07-26T20:00:02.000Z' }));
  window.accept(event({ eventId: 'event.3', emittedAt: '2026-07-26T20:00:03.000Z' }));
  assert.equal(first.accepted, true);
  const recovery = window.recover(first.accepted ? first.delivery.cursor : null);
  assert.equal(recovery.gapDetected, true);
  assert.deepEqual(recovery.deliveries.map((item) => item.event.eventId), ['event.2', 'event.3']);
});

test('websocket transport uses protocol auth, safe schema, and API-owned mutations', () => {
  const server = source('realtime-service/src/realtime/ws-server.ts');
  const hook = source('hooks/useInboxSocket.ts');
  assert.equal(SOCIAL_REALTIME_PROTOCOL, 'minsah-inbox-v1');
  assert.match(server, /auth\./);
  assert.doesNotMatch(server, /searchParams\.get\(['"]token/);
  assert.match(server, /REFETCH_REQUIRED/);
  assert.match(hook, /sessionStorage/);
  assert.match(hook, /fetch\(['"]\/api\/social\/messages/);
  assert.doesNotMatch(hook, /[?&]token=/);
});
