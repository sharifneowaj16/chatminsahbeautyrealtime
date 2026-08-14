import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  InMemoryMetaSocialWebhookReceiptStore,
  sanitizeMetaSocialWebhookMetadata,
} from '../../lib/meta-platform/repositories/webhook-receipts.ts';
import { InMemoryMetaLeadStorageRepository } from '../../lib/meta-platform/repositories/leads.ts';
import { InMemoryInstagramPersistenceRepository } from '../../lib/meta-platform/repositories/instagram-messages.ts';
import { InMemoryInstagramOutboundRepository } from '../../lib/meta-platform/repositories/instagram-outbound.ts';

const NOW = new Date('2026-07-27T20:30:00.000Z');
const scope = { environment: 'PRODUCTION', connectionKey: 'primary', accountIdentityReferenceId: 'ig-identity-1' };
function ids(prefix = 'id') { let value = 0; return () => `${prefix}-${++value}`; }
function receiptInput(overrides = {}) {
  return {
    platform: 'LEAD_ADS', environment: 'PRODUCTION', connectionKey: 'primary',
    providerDeliveryId: 'delivery-lead-1', providerEventKey: 'leadgen:page-1:form-1:lead-1',
    payloadDigest: 'a'.repeat(64), correlationId: 'meta-webhook:layer9.3', receivedAt: NOW,
    safeMetadata: { objectType: 'page', eventType: 'LEADGEN', pageId: 'page-1', formId: 'form-1', leadgenId: 'lead-1' },
    ...overrides,
  };
}

async function deadLetterReceipt() {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput({
    replaySourceType: 'NORMALIZED_LEAD', replaySourceId: 'lead-record-1',
  }));
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff', now: NOW });
  const claim = store.claim({ receiptId: created.receipt.id, leaseOwner: 'worker-1', now: NOW, leaseMs: 5_000 });
  store.markFailed({ receiptId: created.receipt.id, leaseToken: claim.leaseToken, failureCode: 'META_PROVIDER_UNAVAILABLE', failureCategory: 'TRANSIENT_PROVIDER', actor: 'worker-1', now: new Date(NOW.getTime() + 1_000) });
  const dead = store.markDeadLettered({ receiptId: created.receipt.id, failureCode: 'RETRY_EXHAUSTED', actor: 'retry-controller', now: new Date(NOW.getTime() + 2_000) });
  return { store, dead };
}

test('9.3 canonical receipt duplicate is idempotent and digest mismatch stays observable', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const first = await store.createOrGet(receiptInput());
  const duplicate = await store.createOrGet(receiptInput({ payloadDigest: 'b'.repeat(64), receivedAt: new Date(NOW.getTime() + 1_000) }));
  assert.equal(duplicate.receipt.id, first.receipt.id);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.receipt.duplicateCount, 1);
  assert.equal(duplicate.receipt.digestMismatchCount, 1);
  assert.equal(store.snapshot().length, 1);
});

test('9.3 process crash lease is reclaimable and stale worker is fenced', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff', now: NOW });
  const first = store.claim({ receiptId: created.receipt.id, leaseOwner: 'worker-a', now: NOW, leaseMs: 5_000 });
  const reclaimed = store.claim({ receiptId: created.receipt.id, leaseOwner: 'worker-b', now: new Date(NOW.getTime() + 5_001), leaseMs: 5_000 });
  assert.equal(reclaimed.reclaimed, true);
  assert.equal(reclaimed.receipt.attemptCount, 2);
  assert.throws(() => store.markProcessed({ receiptId: created.receipt.id, leaseToken: first.leaseToken, actor: 'worker-a' }), /does not belong/);
  assert.equal(store.markProcessed({ receiptId: created.receipt.id, leaseToken: reclaimed.leaseToken, actor: 'worker-b' }).state, 'PROCESSED');
});

test('9.3 invalid terminal-state transitions are rejected', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const claim = store.claim({ receiptId: created.receipt.id, leaseOwner: 'worker-1' });
  store.markProcessed({ receiptId: created.receipt.id, leaseToken: claim.leaseToken, actor: 'worker-1' });
  assert.throws(() => store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-2', actor: 'handoff' }), /cannot transition/);
});

test('9.3 controlled dead-letter replay is audited, two-person approved and request-idempotent', async () => {
  const { store, dead } = await deadLetterReceipt();
  await assert.rejects(store.createReplayAttempt({
    originalReceiptId: dead.id, replayRequestKey: 'ticket-1', reason: 'Retry.', actor: 'admin-1',
    approvalId: 'approval-1', approvedBy: 'admin-1', approvedAt: NOW, approvalReference: 'ticket-1', now: NOW,
  }), /TWO_PERSON/);
  const input = {
    originalReceiptId: dead.id, replayRequestKey: 'ticket-1', reason: 'Provider recovered.', actor: 'admin-1',
    approvalId: 'approval-1', approvedBy: 'admin-2', approvedAt: NOW, approvalReference: 'ticket-1', now: NOW,
  };
  const first = await store.createReplayAttempt(input);
  const second = await store.createReplayAttempt(input);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.receipt.id, second.receipt.id);
  assert.equal(first.receipt.parentReceiptId, dead.id);
  assert.equal(first.receipt.lastTransitionCode, 'CONTROLLED_REPLAY_CREATED');
  assert.equal(first.receipt.retentionClass, 'REPLAY_AUDIT');
});

test('9.3 normalized Lead replay produces one Lead and one CRM handoff', () => {
  const repository = new InMemoryMetaLeadStorageRepository({ createId: ids('lead') });
  const begin = (receiptId) => repository.beginAttempt({ receiptId, providerLeadId: 'provider-lead-1', environment: 'PRODUCTION', connectionKey: 'primary', pageId: 'page-1', formId: 'form-1' });
  const persist = (receiptId) => repository.persist({ receiptId, providerLeadId: 'provider-lead-1', environment: 'PRODUCTION', connectionKey: 'primary', pageId: 'page-1', formId: 'form-1', phoneFingerprint: 'phone-1', emailFingerprint: 'email-1' });
  begin('receipt-1'); repository.markFetching('receipt-1'); const first = persist('receipt-1');
  begin('receipt-replay'); repository.markFetching('receipt-replay'); const replay = persist('receipt-replay');
  assert.equal(replay.lead.id, first.lead.id);
  assert.equal(repository.snapshot().leads.length, 1);
  assert.equal(repository.snapshot().handoffs.length, 1);
});

test('9.3 inbound Instagram message and outbound key are scope-idempotent', () => {
  const inboundRepository = new InMemoryInstagramPersistenceRepository({ createId: ids('ig') });
  const participant = inboundRepository.upsertParticipant({ ...scope, providerParticipantId: 'person-1', seenAt: NOW });
  const inbound = (receiptId) => inboundRepository.persistInbound({ ...scope, receiptId, providerConversationKey: 'conversation-1', participantIdentityId: participant.id, providerMessageId: 'message-1', payloadDigest: 'digest-1', occurredAt: NOW, replyWindowMs: 86_400_000, privateReplyWindowMs: 604_800_000 });
  const first = inbound('receipt-1');
  const duplicate = inbound('receipt-2');
  assert.equal(duplicate.message.id, first.message.id);
  assert.equal(inboundRepository.snapshot().messages.length, 1);

  const outboundRepository = new InMemoryInstagramOutboundRepository({ createId: ids('send') });
  const send1 = outboundRepository.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'payload-a' });
  const send2 = outboundRepository.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'payload-a' });
  assert.equal(send1.attempt.id, send2.attempt.id);
  assert.throws(() => outboundRepository.createOrGet({ ...scope, idempotencyKey: 'send-key-1', payloadHash: 'payload-b' }), /PAYLOAD_MISMATCH/);
});

test('9.3 safe metadata projection removes secrets and customer PII', () => {
  const safe = sanitizeMetaSocialWebhookMetadata({
    objectType: 'instagram', accountId: 'ig-1', platformMessageId: 'mid-1',
    accessToken: 'secret-token', authorization: 'Bearer secret', email: 'person@example.com', phone: '+8801700000000', messageText: 'private', rawPayload: { access_token: 'secret' },
  });
  assert.deepEqual(safe, { objectType: 'instagram', accountId: 'ig-1', platformMessageId: 'mid-1' });
});

test('9.3 migrations contain all DB uniqueness boundaries and recovery pairs', () => {
  const required = new Map([
    ['prisma/migrations/20260724233000_phase31_unified_webhook_receipts/migration.sql', ['MetaSocialWebhookReceipt_dedupe_scope_key']],
    ['prisma/migrations/20260725063000_phase31_lead_normalized_storage/migration.sql', ['MetaLeadProcessingAttempt_receiptId_key', 'MetaLeadHandoff_lead_destination_key']],
    ['prisma/migrations/20260725093000_phase31_instagram_message_persistence/migration.sql', ['MetaMessage_scope_provider_key', 'MetaMessage_scope_outbound_idempotency_key', 'MetaInstagramPrivateReply_scope_comment_key']],
  ]);
  for (const [migration, names] of required) {
    const source = fs.readFileSync(migration, 'utf8');
    for (const name of names) assert.match(source, new RegExp(name));
    assert.equal(fs.existsSync(migration.replace('migration.sql', 'recovery.sql')), true);
  }
});

test('9.3 Instagram migration and historical recoveries are atomic and partial-failure safe', () => {
  const instagramDir = 'prisma/migrations/20260725093000_phase31_instagram_message_persistence';
  const migration = fs.readFileSync(`${instagramDir}/migration.sql`, 'utf8');
  const recovery = fs.readFileSync(`${instagramDir}/recovery.sql`, 'utf8');
  const participantIndex = 'CREATE UNIQUE INDEX "MetaInstagramParticipant_scope_provider_key"';
  const participantConflict = 'ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","providerParticipantId")';

  assert.match(migration, /\bBEGIN;[\s\S]*\bCOMMIT;\s*$/);
  assert.ok(migration.indexOf(participantIndex) >= 0);
  assert.ok(migration.indexOf(participantIndex) < migration.indexOf(participantConflict));
  assert.match(recovery, /\bBEGIN;[\s\S]*\bCOMMIT;\s*$/);
  for (const indexName of [
    'MetaInstagramReplyAttempt_idempotencyKey_key',
    'MetaMessage_platformId_key',
    'MetaConversation_platformId_key',
  ]) {
    assert.match(recovery, new RegExp(`CREATE UNIQUE INDEX IF NOT EXISTS "${indexName}"`));
  }

  const reliabilityRecovery = fs.readFileSync(
    'prisma/migrations/20260722233000_add_meta_reliability_governance/recovery.sql',
    'utf8',
  );
  assert.match(reliabilityRecovery, /\bBEGIN;[\s\S]*\bCOMMIT;\s*$/);
  assert.match(reliabilityRecovery, /CREATE OR REPLACE FUNCTION "meta_operation_protect_immutable_fields"/);
  assert.match(reliabilityRecovery, /CREATE OR REPLACE FUNCTION "meta_outbox_protect_immutable_fields"/);
  const restoredFunctions = reliabilityRecovery.slice(
    reliabilityRecovery.indexOf('CREATE OR REPLACE FUNCTION'),
    reliabilityRecovery.indexOf('ALTER TABLE "MetaOutboxMessage" DROP COLUMN'),
  );
  assert.doesNotMatch(restoredFunctions, /NEW\."(?:priority|expiresAt)"/);
});

test('9.3 database drill is fail-closed and proves apply/recovery/reapply plus concurrency when executed', () => {
  const source = fs.readFileSync('scripts/phase31-layer3-db-drill.sh', 'utf8');
  for (const phrase of [
    'PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES', 'Target database is not empty', 'APPLY PASS', 'RECOVERY PASS',
    'REAPPLY PASS', 'run_concurrency_drill "initial"', 'run_concurrency_drill "reapply"', 'stale-worker fencing',
  ]) assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
