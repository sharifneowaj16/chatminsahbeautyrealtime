import assert from 'node:assert/strict';
import test from 'node:test';
import { digestMetaWebhookPayload } from '../../lib/meta-platform/transports/webhook/signature.ts';
import {
  InMemoryMetaSocialWebhookReceiptStore,
  isMetaSocialWebhookMetadataPrunable,
  isMetaSocialWebhookSensitiveKey,
  projectMetaSocialWebhookReceiptForAdmin,
  resolveMetaSocialWebhookReplayEligibility,
  resolveMetaSocialWebhookRetention,
  sanitizeMetaSocialWebhookMetadata,
} from '../../lib/meta-platform/repositories/webhook-receipts.ts';

const NOW = new Date('2026-07-25T12:30:00.000Z');
const DIGEST = 'a'.repeat(64);

function base(overrides = {}) {
  return {
    platform: 'INSTAGRAM', environment: 'PRODUCTION', connectionKey: 'primary',
    providerEventKey: 'instagram:message:mid-1', providerDeliveryId: 'delivery-1',
    payloadDigest: DIGEST, correlationId: 'meta-webhook:payload-retention-1', receivedAt: NOW,
    safeMetadata: { objectType: 'instagram', eventType: 'messages', accountId: 'ig-1', platformMessageId: 'mid-1' },
    ...overrides,
  };
}

async function deadLetterWithSource({ failureCode = 'RETRY_EXHAUSTED', failureCategory = 'TRANSIENT_PROVIDER', sourceExpiresAt = null } = {}) {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(base({
    replaySourceType: 'INSTAGRAM_MESSAGE', replaySourceId: 'message-record-1', replaySourceExpiresAt: sourceExpiresAt,
  }));
  store.markQueued({ receiptId: created.receipt.id, queueName: 'instagram-inbound', jobReference: 'job-1', actor: 'handoff', now: NOW });
  const claim = store.claim({ receiptId: created.receipt.id, leaseOwner: 'worker-1', now: NOW, leaseMs: 5_000 });
  store.markFailed({ receiptId: created.receipt.id, leaseToken: claim.leaseToken, failureCode, failureCategory, actor: 'worker-1', now: new Date(NOW.getTime() + 1_000) });
  const dead = store.markDeadLettered({ receiptId: created.receipt.id, failureCode: 'RETRY_EXHAUSTED', actor: 'retry-controller', now: new Date(NOW.getTime() + 2_000) });
  return { store, dead };
}

test('canonical webhook digest is deterministic over exact raw body bytes', () => {
  const body = '{"entry":[{"id":"1"}]}';
  assert.equal(digestMetaWebhookPayload(body), digestMetaWebhookPayload(Buffer.from(body)));
  assert.notEqual(digestMetaWebhookPayload(body), digestMetaWebhookPayload(`${body}\n`));
  assert.notEqual(digestMetaWebhookPayload('{"a":1,"b":2}'), digestMetaWebhookPayload('{"b":2,"a":1}'));
});

test('safe projection uses an allowlist and denylist recognizes common secret and PII keys', () => {
  for (const key of ['access_token', 'accessToken', 'Authorization', 'email', 'phone', 'messageText', 'signed_url', 'rawPayload']) {
    assert.equal(isMetaSocialWebhookSensitiveKey(key), true, key);
  }
  const safe = sanitizeMetaSocialWebhookMetadata({
    objectType: 'instagram', accountId: 'ig-1', platformMessageId: 'mid-1',
    accessToken: 'secret', Authorization: 'Bearer secret', email: 'p@example.com', phone: '+15555550100',
    messageText: 'private', signed_url: 'https://example.test/?token=secret', rawPayload: { access_token: 'secret' },
  });
  assert.deepEqual(safe, { objectType: 'instagram', accountId: 'ig-1', platformMessageId: 'mid-1' });
});

test('retention separates safe metadata deadline from longer dedupe tombstone', () => {
  const standard = resolveMetaSocialWebhookRetention({ receivedAt: NOW });
  assert.equal(standard.retentionClass, 'STANDARD_WEBHOOK');
  assert.equal(standard.retentionUntil.toISOString(), '2026-08-24T12:30:00.000Z');
  assert.equal(standard.dedupeRetainUntil.toISOString(), '2027-07-25T12:30:00.000Z');
  const replay = resolveMetaSocialWebhookRetention({ receivedAt: NOW, retentionClass: 'REPLAY_AUDIT' });
  assert.ok(replay.dedupeRetainUntil > replay.retentionUntil);
});

test('metadata pruning is terminal-state and deadline guarded while dedupe evidence remains', () => {
  assert.equal(isMetaSocialWebhookMetadataPrunable({ state: 'PROCESSING', retentionUntil: NOW, dedupeRetainUntil: new Date(NOW.getTime() + 10_000), now: NOW }), false);
  assert.equal(isMetaSocialWebhookMetadataPrunable({ state: 'PROCESSED', retentionUntil: NOW, dedupeRetainUntil: new Date(NOW.getTime() + 10_000), now: NOW }), true);
  assert.equal(isMetaSocialWebhookMetadataPrunable({ state: 'PROCESSED', retentionUntil: NOW, dedupeRetainUntil: NOW, now: NOW }), false);
});

test('replay eligibility blocks missing source, expired source and unknown write outcomes', () => {
  assert.equal(resolveMetaSocialWebhookReplayEligibility({ state: 'DEAD_LETTERED', replaySourceType: 'NONE', now: NOW }), 'SOURCE_UNAVAILABLE');
  assert.equal(resolveMetaSocialWebhookReplayEligibility({ state: 'DEAD_LETTERED', replaySourceType: 'INSTAGRAM_MESSAGE', replaySourceId: 'm1', replaySourceExpiresAt: new Date(NOW.getTime() - 1), now: NOW }), 'SOURCE_EXPIRED');
  assert.equal(resolveMetaSocialWebhookReplayEligibility({ state: 'DEAD_LETTERED', replaySourceType: 'INSTAGRAM_MESSAGE', replaySourceId: 'm1', failureCode: 'META_UNKNOWN_OUTCOME', now: NOW }), 'UNKNOWN_OUTCOME_BLOCKED');
  assert.equal(resolveMetaSocialWebhookReplayEligibility({ state: 'DEAD_LETTERED', replaySourceType: 'INSTAGRAM_MESSAGE', replaySourceId: 'm1', now: NOW }), 'APPROVAL_REQUIRED');
});

test('controlled replay requires two-person approval and preserves original dedupe identity', async () => {
  const { store, dead } = await deadLetterWithSource();
  await assert.rejects(store.createReplayAttempt({
    originalReceiptId: dead.id, replayRequestKey: 'ticket-1', reason: 'Retry after provider recovery.', actor: 'admin-1',
    approvalId: 'approval-1', approvedBy: 'admin-1', approvedAt: NOW, approvalReference: 'ticket-1', now: NOW,
  }), /TWO_PERSON/);
  const replay = await store.createReplayAttempt({
    originalReceiptId: dead.id, replayRequestKey: 'ticket-1', reason: 'Retry after provider recovery.', actor: 'admin-1',
    approvalId: 'approval-1', approvedBy: 'admin-2', approvedAt: NOW, approvalReference: 'ticket-1', now: NOW,
  });
  assert.equal(replay.receipt.parentReceiptId, dead.id);
  assert.equal(replay.receipt.replayApprovalId, 'approval-1');
  assert.equal(replay.receipt.retentionClass, 'REPLAY_AUDIT');
  assert.equal(store.getById(dead.id)?.providerEventKey, 'instagram:message:mid-1');
});

test('same replay key is idempotent but cannot be rebound to different approval metadata', async () => {
  const { store, dead } = await deadLetterWithSource();
  const input = {
    originalReceiptId: dead.id, replayRequestKey: 'ticket-2', reason: 'Approved replay.', actor: 'admin-1',
    approvalId: 'approval-2', approvedBy: 'admin-2', approvedAt: NOW, approvalReference: 'ticket-2', now: NOW,
  };
  const first = await store.createReplayAttempt(input);
  const second = await store.createReplayAttempt(input);
  assert.equal(first.receipt.id, second.receipt.id);
  await assert.rejects(store.createReplayAttempt({ ...input, approvalId: 'approval-other' }), (error) => error?.code === 'META_SOCIAL_WEBHOOK_REPLAY_REQUEST_CONFLICT');
});

test('admin projection exposes digest prefixes and safe metadata only', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(base());
  await store.createOrGet(base({ payloadDigest: 'b'.repeat(64), receivedAt: new Date(NOW.getTime() + 1_000) }));
  const projection = projectMetaSocialWebhookReceiptForAdmin(store.getById(created.receipt.id));
  assert.equal(projection.payloadDigestPrefix.length, 16);
  assert.equal(projection.lastPayloadDigestPrefix, 'b'.repeat(16));
  assert.equal(projection.lastDigestMismatchCode, 'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH');
  const serialized = JSON.stringify(projection);
  for (const forbidden of ['access_token', 'Bearer ', 'p@example.com', '+15555550100']) assert.equal(serialized.includes(forbidden), false);
});

test('replay result remains child receipt state authority with terminal trace fields', async () => {
  const { store, dead } = await deadLetterWithSource();
  const replay = await store.createReplayAttempt({
    originalReceiptId: dead.id, replayRequestKey: 'ticket-result', reason: 'Approved replay.', actor: 'admin-1',
    approvalId: 'approval-result', approvedBy: 'admin-2', approvedAt: NOW, approvalReference: 'ticket-result', now: NOW,
  });
  store.markQueued({ receiptId: replay.receipt.id, queueName: 'instagram-inbound', jobReference: 'job-replay', actor: 'handoff', now: NOW });
  const claim = store.claim({ receiptId: replay.receipt.id, leaseOwner: 'worker-replay', now: NOW, leaseMs: 5_000 });
  const processed = store.markProcessed({ receiptId: replay.receipt.id, leaseToken: claim.leaseToken, actor: 'worker-replay', now: new Date(NOW.getTime() + 1_000) });
  assert.equal(processed.state, 'PROCESSED');
  assert.equal(processed.replayResultCode, 'PROCESSED');
  assert.equal(processed.replayCompletedAt?.toISOString(), '2026-07-25T12:30:01.000Z');
});
