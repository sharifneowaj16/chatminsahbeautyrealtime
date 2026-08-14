#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const includesAll = (source, values) => values.every((value) => source.includes(value));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const layer3Migrations = [
  '20260724233000_phase31_unified_webhook_receipts',
  '20260725003000_phase31_webhook_receipt_transitions',
  '20260725033000_phase31_provider_identity_mapping',
  '20260725063000_phase31_lead_normalized_storage',
  '20260725093000_phase31_instagram_message_persistence',
  '20260725123000_phase31_payload_retention_replay_metadata',
];

const runner = read('scripts/phase31-layer3-db-drill.sh');
const preconditions = read('scripts/phase31-sql/layer3-preconditions.sql');
const idempotency = read('scripts/phase31-sql/layer3-idempotency.sql');
const claim = read('scripts/phase31-sql/layer3-claim.sql');
const postRecovery = read('scripts/phase31-sql/layer3-post-recovery.sql');
const packageJson = JSON.parse(read('package.json'));
const evidence = read('evidence/phase31-meta-social-crm/03-persistence-dedupe.md');
const schema = read('prisma/schema.prisma');

check('Layer 3.8 does not introduce a new Prisma schema change', sha256(schema) === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check('all six Layer 3 migrations are ordered and have migration/recovery/README triplets', layer3Migrations.every((name) =>
  exists(`prisma/migrations/${name}/migration.sql`)
  && exists(`prisma/migrations/${name}/recovery.sql`)
  && exists(`prisma/migrations/${name}/README.md`)
));
check('runner requires explicit disposable database confirmation', includesAll(runner, [
  'PHASE31_LAYER3_CONFIRM_DISPOSABLE', 'Target database is not empty', 'Supply a fresh disposable database',
]));
check('runner never prints the database URL', !runner.includes('echo "$DATABASE_URL_VALUE"') && !runner.includes('printf \'%s\' "$DATABASE_URL_VALUE"'));
check('runner applies the complete migration history in lexical order', includesAll(runner, [
  'find prisma/migrations', '-name migration.sql', 'sort', 'for migration in "${ALL_MIGRATIONS[@]}"',
]));
check('runner recovers Layer 3 in reverse dependency order', includesAll(runner, [
  'for ((i=${#LAYER3_DIRS[@]}-1; i>=0; i--))', 'recovery.sql', 'order=3.7,3.6,3.5,3.4,3.3,3.2',
]));
check('runner reapplies Layer 3 in forward order', includesAll(runner, [
  'for dir in "${LAYER3_DIRS[@]}"', 'REAPPLY', 'order=3.2,3.3,3.4,3.5,3.6,3.7',
]));
check('runner produces the three required evidence logs', includesAll(runner, [
  'layer3-migration-apply.log', 'layer3-migration-recovery.log', 'layer3-idempotency.log',
]));
check('runner fails closed with a deterministic BLOCKED verdict when prerequisites are absent', includesAll(runner, [
  'Layer 3.8 database gate: BLOCKED', 'No migration apply/recovery/re-apply or PostgreSQL concurrency PASS is claimed.', 'exit 2',
]));
check('runner runs assertions both before and after recovery/reapply', (runner.match(/layer3-preconditions\.sql/g) ?? []).length === 2
  && (runner.match(/layer3-idempotency\.sql/g) ?? []).length === 2
  && includesAll(runner, ['run_concurrency_drill "initial"', 'run_concurrency_drill "reapply"']));
check('runner demonstrates one-winner concurrent claim with separate PostgreSQL sessions', includesAll(runner, [
  'worker-a', 'worker-b', 'hold_seconds="2"', 'winner_count', 'expected one claim winner',
]));
check('runner demonstrates expired-lease reclaim and stale-worker fencing', includesAll(runner, [
  "INTERVAL '1 second'", 'worker-reclaim', 'PROCESSING_RECLAIMED', 'stale_worker_update_rows',
]));
check('claim SQL uses row locking and SKIP LOCKED', includesAll(claim, [
  'FOR UPDATE SKIP LOCKED', '"state"=\'PROCESSING\'', '"attemptCount"=receipt."attemptCount" + 1',
  'PROCESSING_RECLAIMED',
]));
check('duplicate precondition SQL covers receipt, Lead, Lead handoff, Instagram and retention', includesAll(preconditions, [
  'MetaSocialWebhookReceipt', 'MetaLeadProcessingAttempt', 'MetaLeadHandoff', 'MetaConversation',
  'MetaMessage', 'MetaInstagramPrivateReplyReservation', 'dedupeRetainUntil',
]));
check('DB idempotency SQL covers canonical receipt upsert and digest mismatch', includesAll(idempotency, [
  'ON CONFLICT ("provider", "platform", "environment", "connectionKey", "providerEventKey")',
  '"duplicateCount"', '"digestMismatchCount"', 'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH',
]));
check('DB idempotency SQL covers Lead provider ID, processing receipt and handoff boundaries', includesAll(idempotency, [
  'Duplicate provider Lead ID was not blocked', 'Duplicate Lead processing receipt was not blocked',
  'Duplicate Lead destination handoff was not blocked',
]));
check('DB idempotency SQL covers Instagram conversation, inbound, outbound and private-reply boundaries', includesAll(idempotency, [
  'Duplicate scoped Instagram conversation was not blocked', 'Duplicate inbound provider message was not blocked',
  'Duplicate outbound idempotency key was not blocked', 'Second private reply reservation was not blocked',
]));
check('DB idempotency SQL verifies safe projection excludes sensitive diagnostic keys', includesAll(idempotency, [
  'Safe metadata contains prohibited sensitive keys', 'access[_-]?token', 'authorization', 'rawpayload', 'sourceurl',
]));
check('idempotency fixture is transactionally rolled back', idempotency.includes('BEGIN;') && idempotency.trimEnd().endsWith('ROLLBACK;'));
check('post-recovery assertions require Layer 3 objects removed and legacy/business tables preserved', includesAll(postRecovery, [
  'MetaSocialWebhookReceipt', 'MetaLeadProcessingAttempt', 'MetaInstagramPrivateReplyReservation',
  'MetaWebhookReceipt', 'MetaInstagramWebhookReceipt', 'MetaLead', 'MetaConversation', 'MetaMessage',
]));
check('package exposes source gate, full gate and explicit PostgreSQL drill commands', packageJson.scripts['test:meta-v6-phase31-layer3-gate'] === 'node --test tests/meta-v6/phase31-layer3-gate.test.mjs'
  && packageJson.scripts['qa:meta-platform-phase31-layer3-gate'] === 'node scripts/meta-platform-phase31-layer3-gate-audit.mjs'
  && packageJson.scripts['qa:phase31-meta-layer3-db'] === 'bash scripts/phase31-layer3-db-drill.sh'
  && packageJson.scripts['qa:phase31-meta-layer3-source'] === 'npm run qa:phase31-meta-webhooks && npm run qa:phase31-meta-persistence'
  && packageJson.scripts['qa:phase31-meta-layer3'] === 'npm run qa:phase31-meta-layer3-source && npm run qa:phase31-meta-layer3-db');
const phase31StaticAuditContract = read('scripts/meta-v6-phase31-audit-contract.mjs');
check('persistence aggregate includes Layer 3.8 source test and audit but not the database drill', packageJson.scripts['qa:phase31-meta-persistence'] === 'node scripts/meta-v6-phase31-persistence-audit.mjs'
  && phase31StaticAuditContract.includes("'test:meta-v6-phase31-layer3-gate'")
  && phase31StaticAuditContract.includes("'qa:meta-platform-phase31-layer3-gate'")
  && !phase31StaticAuditContract.includes("'qa:phase31-meta-layer3-db'"));
check('cumulative evidence has a Layer 3.8 gate section and explicit runtime verdict', includesAll(evidence, [
  'Layer 3.8 cumulative update', 'Disposable PostgreSQL apply/recovery/re-apply', 'Layer 3 status', 'Exact next item',
]));

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
}
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 Layer 3.8 source gate audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
