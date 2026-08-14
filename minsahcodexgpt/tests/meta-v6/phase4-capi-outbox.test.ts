import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { buildMetaPurchaseOutboxInput } from '../../lib/meta/capi/builder';
import { buildMetaPurchaseEventId } from '../../lib/meta/capi/event-id';
import { classifyMetaDeliveryFailure } from '../../lib/meta/capi/response';
import { getMetaOutboxRetryDelayMs, META_OUTBOX_MAX_ATTEMPTS } from '../../lib/meta/capi/retry';
import { hashMetaUserValue, normalizeMetaEmail, normalizeMetaPhone } from '../../lib/meta/capi/user-data';
import { normalizeMetaEventSourceUrl, validateMetaWebsiteEvent } from '../../lib/meta/capi/validator';

const NOW = Math.floor(new Date('2026-07-17T14:00:00.000Z').getTime() / 1000);

function event(overrides: Record<string, unknown> = {}) {
  return {
    event_name: 'Purchase',
    event_time: NOW,
    event_id: 'Purchase-order-1001',
    action_source: 'website' as const,
    event_source_url: 'https://minsahbeauty.example/checkout/payment-complete?token=secret#done',
    user_data: { external_id: ['a'.repeat(64)] },
    custom_data: { value: 1250, currency: 'BDT', order_id: 'order-1001' },
    ...overrides,
  };
}

test('website contract requires action source, source URL, event identity and custom data', () => {
  const valid = validateMetaWebsiteEvent(event(), NOW);
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedEventSourceUrl, 'https://minsahbeauty.example/checkout/payment-complete');

  const invalid = validateMetaWebsiteEvent(event({
    event_name: '',
    event_id: '',
    action_source: 'other',
    event_source_url: '',
    custom_data: undefined,
  }) as never, NOW);
  assert.equal(invalid.valid, false);
  assert.deepEqual(
    invalid.issues.map((issue) => issue.code).sort(),
    ['ACTION_SOURCE_INVALID', 'CUSTOM_DATA_REQUIRED', 'EVENT_ID_REQUIRED', 'EVENT_NAME_REQUIRED', 'EVENT_SOURCE_URL_INVALID']
  );
});

test('event age blocks older than seven days and excessive future skew', () => {
  const tooOld = validateMetaWebsiteEvent(event({ event_time: NOW - 7 * 24 * 60 * 60 - 1 }), NOW);
  assert.equal(tooOld.issues.some((issue) => issue.code === 'EVENT_TIME_TOO_OLD'), true);
  const future = validateMetaWebsiteEvent(event({ event_time: NOW + 61 }), NOW);
  assert.equal(future.issues.some((issue) => issue.code === 'EVENT_TIME_IN_FUTURE'), true);
});

test('source URL normalization strips query strings and fragments', () => {
  assert.equal(
    normalizeMetaEventSourceUrl('https://shop.example/path?email=x@example.com#secret'),
    'https://shop.example/path'
  );
  assert.equal(normalizeMetaEventSourceUrl('javascript:alert(1)'), undefined);
});

test('Purchase outbox payload has deterministic browser/server dedup identity', () => {
  const input = buildMetaPurchaseOutboxInput({
    purchaseType: 'online_paid_purchase',
    orderId: 'order-1001',
    eventTime: new Date(NOW * 1000),
    eventSourceUrl: 'https://minsahbeauty.example/checkout/payment-complete?bpt=secret',
    sourceType: 'ONLINE_PAYMENT_VERIFIED',
  });
  assert.equal(input.eventId, buildMetaPurchaseEventId('order-1001'));
  assert.equal(input.eventId, 'Purchase-order-1001');
  assert.equal(input.eventSourceUrl, 'https://minsahbeauty.example/checkout/payment-complete');
  assert.deepEqual(input.payload, {
    kind: 'purchase',
    purchaseType: 'online_paid_purchase',
    orderId: 'order-1001',
  });
});

test('normalization hashes once and accepts already-hashed values', () => {
  assert.equal(normalizeMetaEmail(' Customer@Example.COM '), 'customer@example.com');
  assert.equal(normalizeMetaPhone('01700-000000'), '8801700000000');
  const hash = hashMetaUserValue('customer@example.com');
  assert.equal(hash?.length, 64);
  assert.equal(hashMetaUserValue(hash), hash);
});


test('retry schedule follows the bounded 1m, 5m, 15m, 1h policy', () => {
  assert.equal(META_OUTBOX_MAX_ATTEMPTS, 5);
  assert.equal(getMetaOutboxRetryDelayMs(1), 60_000);
  assert.equal(getMetaOutboxRetryDelayMs(2), 5 * 60_000);
  assert.equal(getMetaOutboxRetryDelayMs(3), 15 * 60_000);
  assert.equal(getMetaOutboxRetryDelayMs(4), 60 * 60_000);
});

test('provider response classification separates transient, auth and permanent failures', () => {
  assert.equal(classifyMetaDeliveryFailure({ networkError: true }), 'TRANSIENT');
  assert.equal(classifyMetaDeliveryFailure({ status: 429 }), 'TRANSIENT');
  assert.equal(classifyMetaDeliveryFailure({ status: 503 }), 'TRANSIENT');
  assert.equal(classifyMetaDeliveryFailure({ status: 400, errorCode: 190 }), 'AUTH');
  assert.equal(classifyMetaDeliveryFailure({ status: 400, errorCode: 100 }), 'PERMANENT');
});

test('Prisma schema and migration enforce DB-level Meta deduplication', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync(
    'prisma/migrations/20260717020000_meta_v6_phase4_capi_outbox/migration.sql',
    'utf8'
  );
  assert.match(schema, /enum MetaEventOutboxStatus/);
  assert.match(schema, /model MetaEventOutbox/);
  assert.match(schema, /@@unique\(\[provider, eventName, eventId\]\)/);
  assert.match(schema, /model MetaEventOutboxStatusEvent/);
  assert.match(migration, /CREATE UNIQUE INDEX "MetaEventOutbox_provider_eventName_eventId_key"/);
});

test('outbox repository leases with SKIP LOCKED and preserves state history', () => {
  const source = fs.readFileSync('lib/meta/capi/outbox-repository.ts', 'utf8');
  assert.match(source, /FOR UPDATE SKIP LOCKED/);
  assert.match(source, /ON CONFLICT \("provider", "eventName", "eventId"\) DO NOTHING/);
  assert.match(source, /MetaEventOutboxStatusEvent/);
  for (const status of ['PENDING', 'DISPATCHED', 'PROCESSING', 'SENT', 'RETRY_SCHEDULED', 'FAILED_PERMANENT']) {
    assert.match(source, new RegExp(status));
  }
});

test('business state transactions insert Purchase outbox before commit', () => {
  const files = [
    'app/api/payments/verified/route.ts',
    'app/api/telegram/order-callback/route.ts',
    'app/api/admin/orders/[id]/route.ts',
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /\$transaction\(async \(tx\)/);
    assert.match(source, /createMetaPurchaseOutboxInTransaction/);
    assert.doesNotMatch(source, /enqueueMetaCapiPurchase/);
  }
});

test('provider-specific dispatcher and sender workers recover independently of checkout', () => {
  const dispatcher = fs.readFileSync('workers/meta-outbox-dispatcher.worker.ts', 'utf8');
  const sender = fs.readFileSync('workers/meta-capi-sender.worker.ts', 'utf8');
  const queue = fs.readFileSync('lib/queue/metaCapiOutboxQueue.ts', 'utf8');
  assert.match(dispatcher, /dispatchDueMetaOutbox/);
  assert.match(sender, /processMetaOutboxById/);
  assert.match(queue, /META_QUEUE_NAMES\.CAPI_EVENTS/);
  assert.match(queue, /buildCapiOutboxIdempotencyKey/);
});
