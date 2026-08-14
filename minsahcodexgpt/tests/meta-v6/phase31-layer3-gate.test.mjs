import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');
const runner = read('scripts/phase31-layer3-db-drill.sh');
const preconditions = read('scripts/phase31-sql/layer3-preconditions.sql');
const idempotency = read('scripts/phase31-sql/layer3-idempotency.sql');
const claim = read('scripts/phase31-sql/layer3-claim.sql');
const postRecovery = read('scripts/phase31-sql/layer3-post-recovery.sql');

const migrationNames = [
  '20260724233000_phase31_unified_webhook_receipts',
  '20260725003000_phase31_webhook_receipt_transitions',
  '20260725033000_phase31_provider_identity_mapping',
  '20260725063000_phase31_lead_normalized_storage',
  '20260725093000_phase31_instagram_message_persistence',
  '20260725123000_phase31_payload_retention_replay_metadata',
];

test('all Layer 3 migration triplets exist in chronological order', () => {
  const sorted = [...migrationNames].sort();
  assert.deepEqual(migrationNames, sorted);
  for (const name of migrationNames) {
    for (const file of ['migration.sql', 'recovery.sql', 'README.md']) {
      assert.equal(fs.existsSync(`prisma/migrations/${name}/${file}`), true, `${name}/${file}`);
    }
  }
});

test('database runner fails closed and requires a fresh disposable PostgreSQL target', () => {
  assert.match(runner, /PHASE31_LAYER3_CONFIRM_DISPOSABLE/);
  assert.match(runner, /Target database is not empty/);
  assert.match(runner, /Layer 3\.8 database gate: BLOCKED/);
  assert.match(runner, /No migration apply\/recovery\/re-apply or PostgreSQL concurrency PASS is claimed/);
  assert.doesNotMatch(runner, /echo "\$DATABASE_URL_VALUE"/);
});

test('database runner implements full apply, reverse recovery and forward re-apply', () => {
  assert.match(runner, /ALL_MIGRATIONS/);
  assert.match(runner, /order=3\.7,3\.6,3\.5,3\.4,3\.3,3\.2/);
  assert.match(runner, /order=3\.2,3\.3,3\.4,3\.5,3\.6,3\.7/);
  assert.equal((runner.match(/layer3-preconditions\.sql/g) ?? []).length, 2);
  assert.equal((runner.match(/layer3-idempotency\.sql/g) ?? []).length, 2);
});

test('claim drill uses PostgreSQL locking, lease reclaim and fencing', () => {
  assert.match(claim, /FOR UPDATE SKIP LOCKED/);
  assert.match(claim, /PROCESSING_RECLAIMED/);
  assert.match(runner, /worker-a/);
  assert.match(runner, /worker-b/);
  assert.match(runner, /worker-reclaim/);
  assert.match(runner, /stale_worker_update_rows/);
});

test('duplicate assertions cover receipt, Lead, Instagram and private reply persistence', () => {
  for (const marker of [
    'Duplicate provider Lead ID was not blocked',
    'Duplicate Lead processing receipt was not blocked',
    'Duplicate Lead destination handoff was not blocked',
    'Duplicate scoped Instagram conversation was not blocked',
    'Duplicate inbound provider message was not blocked',
    'Duplicate outbound idempotency key was not blocked',
    'Second private reply reservation was not blocked',
  ]) assert.match(idempotency, new RegExp(marker));
  assert.match(idempotency, /ON CONFLICT \("provider", "platform", "environment", "connectionKey", "providerEventKey"\)/);
  assert.match(idempotency, /ROLLBACK;/);
});

test('preconditions and recovery assertions cover the Layer 3 release boundary', () => {
  for (const marker of ['MetaSocialWebhookReceipt', 'MetaLead', 'MetaConversation', 'MetaMessage', 'dedupeRetainUntil']) {
    assert.match(preconditions, new RegExp(marker));
  }
  for (const marker of ['MetaWebhookReceipt', 'MetaInstagramWebhookReceipt', 'MetaLead', 'MetaConversation', 'MetaMessage']) {
    assert.match(postRecovery, new RegExp(marker));
  }
});
