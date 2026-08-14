#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const schema = read('prisma/schema.prisma');
const model = schema.match(/model MetaSocialWebhookReceipt \{[\s\S]*?\n\}/)?.[0] ?? '';
const migration = read('prisma/migrations/20260725003000_phase31_webhook_receipt_transitions/migration.sql');
const recovery = read('prisma/migrations/20260725003000_phase31_webhook_receipt_transitions/recovery.sql');
const migrationReadme = read('prisma/migrations/20260725003000_phase31_webhook_receipt_transitions/README.md');
const receipt = read('lib/meta-platform/repositories/webhook-receipts.ts');
const transitions = read('lib/meta-platform/repositories/webhook-receipt-transitions.ts');
const claims = read('lib/meta-platform/repositories/webhook-receipt-claims.ts');
const lifecycle = read('lib/meta-platform/repositories/webhook-receipt-lifecycle.ts');
const prismaAdapter = read('lib/meta-platform/repositories/prisma-webhook-receipts.ts');
const repositoryIndex = read('lib/meta-platform/repositories/index.ts');
const leadHandoff = read('lib/meta/leads/handoff.ts');
const leadService = [
  read('lib/meta/leads/service.ts'),
  read('lib/meta-platform/domains/leads/runtime.ts'),
  read('lib/meta/leads/legacy-service.ts'),
].join('\n');
const instagramService = read('lib/meta/instagram/service.ts');
const instagramMessages = read('lib/meta/instagram/messages.ts');
const tests = read('tests/meta-v6/phase31-meta-social-crm-persistence.test.mjs');
const packageJson = JSON.parse(read('package.json'));

const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const includesAll = (value, needles) => needles.every((needle) => value.includes(needle));

check('schema adds lease token, owner and expiry as one ownership triplet', includesAll(model, ['leaseToken', 'leaseOwner', 'leaseExpiresAt']));
check('schema adds lifecycle timestamps without changing the receipt state enum', includesAll(model, [
  'queuedAt', 'processingStartedAt', 'processedAt', 'blockedAt', 'failedAt',
]) && includesAll(schema, ['RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'BLOCKED', 'FAILED', 'DEAD_LETTERED']));
check('schema adds bounded transition audit and optimistic state version fields', includesAll(model, [
  'lastTransitionAt', 'lastTransitionCode', 'lastTransitionActor', 'stateVersion',
]));
check('schema adds state plus lease-expiry reclaim index', model.includes('@@index([state, leaseExpiresAt], map: "MetaSocialWebhookReceipt_state_lease_idx")'));
check('schema preserves Layer 3.2 dedupe key unchanged', model.includes('@@unique([provider, platform, environment, connectionKey, providerEventKey], map: "MetaSocialWebhookReceipt_dedupe_scope_key")'));
check('canonical receipt still has no raw body, message text, token or encrypted payload field', !/\b(rawBody|rawPayload|messageText|accessToken|appSecret|payloadEncrypted)\b/.test(model));

check('migration is additive and does not alter legacy receipt tables', includesAll(migration, [
  'ADD COLUMN "leaseToken"', 'ADD COLUMN "stateVersion"', 'MetaSocialWebhookReceipt_state_lease_idx',
]) && !/ALTER TABLE "(?:MetaWebhookReceipt|MetaInstagramWebhookReceipt|FbWebhookAudit)"/.test(migration));
check('migration fails closed on pre-existing unleased PROCESSING rows', includesAll(migration, [
  'WHERE "state"=\'PROCESSING\'', 'PROCESSING rows exist before lease migration',
]));
check('migration enforces lease triplet and PROCESSING lease invariants', includesAll(migration, [
  'MetaSocialWebhookReceipt_lease_triplet', 'MetaSocialWebhookReceipt_processing_lease',
]));
check('migration enforces state version, actor, code and lifecycle ordering checks', includesAll(migration, [
  'MetaSocialWebhookReceipt_state_version', 'MetaSocialWebhookReceipt_transition_actor_length',
  'MetaSocialWebhookReceipt_transition_code_length', 'MetaSocialWebhookReceipt_lifecycle_order',
]));
check('recovery refuses active leases and removes only Layer 3.3 fields', includesAll(recovery, [
  'Active MetaSocialWebhookReceipt processing lease exists; recovery refused',
  'DROP COLUMN IF EXISTS "leaseToken"', 'DROP COLUMN IF EXISTS "stateVersion"',
]) && !recovery.includes('DROP TABLE IF EXISTS "MetaSocialWebhookReceipt"'));
check('migration README documents compatibility and recovery precondition', includesAll(migrationReadme, [
  'The Layer 3.2 dedupe unique index is unchanged', 'no worker may hold a lease',
]));

check('transition matrix exactly represents the seven allowed state edges', includesAll(transitions, [
  "RECEIVED: Object.freeze(['QUEUED', 'BLOCKED']", "QUEUED: Object.freeze(['PROCESSING']",
  "PROCESSING: Object.freeze(['PROCESSED', 'FAILED']", "FAILED: Object.freeze(['QUEUED', 'DEAD_LETTERED']",
  'PROCESSED: Object.freeze([]', 'BLOCKED: Object.freeze([]', 'DEAD_LETTERED: Object.freeze([]',
]));
check('terminal state helper covers processed, blocked and dead-lettered', includesAll(transitions, [
  "'PROCESSED', 'BLOCKED', 'DEAD_LETTERED'", 'isTerminalMetaSocialWebhookReceiptState',
]));
check('claim contract bounds lease duration and lifecycle actors', includesAll(claims, [
  'META_SOCIAL_WEBHOOK_MIN_LEASE_MS', 'META_SOCIAL_WEBHOOK_MAX_LEASE_MS',
  'META_SOCIAL_WEBHOOK_LEASE_DURATION_INVALID', 'META_SOCIAL_WEBHOOK_LEASE_OWNER_INVALID',
]));
check('lease tokens use cryptographically strong random UUIDs', includesAll(claims, ['randomUUID()', 'createMetaSocialWebhookLeaseToken']));

check('SQL lifecycle repository returns standardized Meta social platform results', includesAll(lifecycle, [
  'createMetaSocialSuccessResult', 'createMetaSocialFailureResult', "domain: 'WEBHOOK'",
]));
check('queue transition accepts RECEIVED or exact same QUEUED reference only', includesAll(lifecycle, [
  "candidate.\"state\"='RECEIVED'", "candidate.\"state\"='QUEUED'", 'candidate."queueName"=$2', 'candidate."jobReference"=$3',
]));
check('claim uses row lock plus skip-locked and only QUEUED or expired PROCESSING rows', includesAll(lifecycle, [
  'FOR UPDATE SKIP LOCKED', '"state"=\'QUEUED\'', '"state"=\'PROCESSING\'', '"leaseExpiresAt" <= $5',
]));
check('claim increments attempts and fences ownership with a fresh lease token', includesAll(lifecycle, [
  '"attemptCount"=receipt."attemptCount" + 1', '"leaseToken"=$2', '"leaseOwner"=$3', '"leaseExpiresAt"=$4',
]));
check('lease renewal requires current state, token, owner and unexpired lease', includesAll(lifecycle, [
  'receipt."state"=\'PROCESSING\'', 'receipt."leaseToken"=$2', 'receipt."leaseOwner"=$3', 'receipt."leaseExpiresAt" > $4',
]));
check('processed and failed transitions require the exact current lease token', (lifecycle.match(/receipt\."leaseToken"=\$2/g) ?? []).length >= 3);
check('terminal completion clears processing lease fields', includesAll(lifecycle, [
  '"state"=\'PROCESSED\'', '"leaseToken"=NULL', '"leaseOwner"=NULL', '"leaseExpiresAt"=NULL',
]));
check('failed transition stores safe failure classification and retry time', includesAll(lifecycle, [
  '"state"=\'FAILED\'', '"failureCode"=$3', '"failureCategory"=$4', '"failureSummary"=$5', '"nextRetryAt"=$6',
]));
check('failed requeue is due-time guarded and retains a durable queue reference', includesAll(lifecycle, [
  'receipt."state"=\'FAILED\'', 'receipt."nextRetryAt" IS NULL OR receipt."nextRetryAt" <= $5',
  'COALESCE($2, receipt."queueName") IS NOT NULL', 'COALESCE($3, receipt."jobReference") IS NOT NULL',
]));
check('dead-letter transition is restricted to FAILED and terminalizes retry metadata', includesAll(lifecycle, [
  '"state"=\'DEAD_LETTERED\'', 'receipt."state"=\'FAILED\'', '"deadLetteredAt"=$5', '"nextRetryAt"=NULL',
]));
check('replay locks original dead-letter row and creates an idempotent child key', includesAll(lifecycle, [
  'WHERE receipt."id"=$1 AND receipt."state"=\'DEAD_LETTERED\'', 'FOR UPDATE OF receipt', 'ON CONFLICT',
  'createHash(\'sha256\').update(requestKey)', 'parentReceiptId',
]));
check('failure summary removes bearer tokens, Meta tokens, email and phone', includesAll(lifecycle, [
  'Bearer [REDACTED]', '[REDACTED_EMAIL]', '[REDACTED_PHONE]', "replace(/EA",
]));

check('in-memory lifecycle mirrors queue, claim, reclaim, retry, dead-letter and replay behavior', includesAll(receipt, [
  'markQueued(input:', 'claim(input:', 'renewLease(input:', 'markProcessed(input:', 'markFailed(input:',
  'requeueFailed(input:', 'markDeadLettered(input:', 'createReplayAttempt(input:',
]));
check('in-memory stale-worker fence compares exact lease token', includesAll(receipt, [
  'requireCurrentLease(row, input.leaseToken)', 'row.leaseToken !== leaseToken',
]));
check('in-memory replay request key is SHA-256 scoped and original remains terminal', includesAll(receipt, [
  "createHash('sha256').update(requestKey)", 'parentReceiptId: original.id', "state !== 'DEAD_LETTERED'",
]));

check('Prisma adapter exports every lifecycle operation from one repository boundary', includesAll(prismaAdapter, [
  'createMetaSocialWebhookReceiptLifecycleRepository', 'markMetaSocialWebhookReceiptQueued',
  'claimMetaSocialWebhookReceipt', 'renewMetaSocialWebhookReceiptLease',
  'markMetaSocialWebhookReceiptProcessed', 'markMetaSocialWebhookReceiptFailed',
  'requeueFailedMetaSocialWebhookReceipt', 'markMetaSocialWebhookReceiptDeadLettered',
  'createMetaSocialWebhookReceiptReplay',
]));
check('repository index exports transition, claim, lifecycle and Prisma-backed contracts', includesAll(repositoryIndex, [
  'META_SOCIAL_WEBHOOK_RECEIPT_TRANSITIONS', 'META_SOCIAL_WEBHOOK_DEFAULT_LEASE_MS',
  'createMetaSocialWebhookReceiptLifecycleRepository', 'claimMetaSocialWebhookReceipt',
]));

const leadEnqueueMarker = leadHandoff.includes('enqueueMetaLeadProcessingJob')
  ? 'const queued = await enqueueMetaLeadProcessingJob'
  : 'const queued = await enqueueMetaLeadFetchJob';
const leadReferenceMarker = leadHandoff.includes('queued.envelope.dedupeKey')
  ? 'jobReference: queued.envelope.dedupeKey'
  : 'jobReference: queued.idempotencyKey';
check('Lead handoff marks canonical QUEUED only after durable queue acceptance', includesAll(leadHandoff, [
  leadEnqueueMarker, 'markMetaSocialWebhookReceiptQueued', leadReferenceMarker, "actor: 'lead-webhook-handoff'",
]) && leadHandoff.indexOf(leadEnqueueMarker) < leadHandoff.indexOf('const canonicalQueued = await markMetaSocialWebhookReceiptQueued'));
const instagramEnqueueMarker = instagramService.includes('enqueueMetaInstagramInboundJob')
  ? 'const queued = await enqueueMetaInstagramInboundJob'
  : 'const queued = await enqueueMetaInstagramMessageJob';
const instagramReferenceMarker = instagramService.includes('queued.envelope.dedupeKey')
  ? 'jobReference: queued.envelope.dedupeKey'
  : 'jobReference: queued.idempotencyKey';
check('Instagram handoff marks canonical QUEUED only after durable queue acceptance', includesAll(instagramService, [
  instagramEnqueueMarker, 'markMetaSocialWebhookReceiptQueued', instagramReferenceMarker, "actor: 'instagram-webhook-handoff'",
]) && instagramService.indexOf(instagramEnqueueMarker) < instagramService.indexOf('const canonicalQueued = await markMetaSocialWebhookReceiptQueued'));
check('Lead processing resolves canonical legacy link and claims before provider processing', includesAll(leadService, [
  "legacyReceiptType: 'MetaWebhookReceipt'", 'claimMetaSocialWebhookReceipt',
  'canonicalLease', 'markMetaSocialWebhookReceiptProcessed', 'markMetaSocialWebhookReceiptFailed',
]) && leadService.indexOf('claimMetaSocialWebhookReceipt') < leadService.indexOf('fetchMetaLeadGraphRecord'));
check('Lead retry invocation requeues FAILED before claiming', includesAll(leadService, [
  "canonical.state === 'FAILED'", 'requeueFailedMetaSocialWebhookReceipt', "actor: 'meta-lead-worker-retry'",
]));
check('Instagram processing resolves canonical legacy link and claims before legacy PROCESSING', includesAll(instagramMessages, [
  "legacyReceiptType: 'MetaInstagramWebhookReceipt'", 'claimMetaSocialWebhookReceipt',
  'canonicalLease', 'markMetaSocialWebhookReceiptProcessed', 'markMetaSocialWebhookReceiptFailed',
]) && instagramMessages.indexOf('claimMetaSocialWebhookReceipt') < instagramMessages.indexOf("status: 'PROCESSING'"));
check('Instagram retry invocation requeues FAILED before claiming', includesAll(instagramMessages, [
  "canonical.state === 'FAILED'", 'requeueFailedMetaSocialWebhookReceipt', "actor: 'meta-instagram-worker-retry'",
]));
check('no route/domain directly updates canonical receipt outside repository boundary', !/prisma\.metaSocialWebhookReceipt\.(?:update|updateMany|upsert|create|delete)/.test([
  leadHandoff, leadService, instagramService, instagramMessages,
].join('\n')));

check('runtime tests cover active lease exclusion, reclaim, stale fencing, retry, dead-letter and replay', includesAll(tests, [
  'two workers cannot own one active receipt lease', 'expired processing lease is reclaimed',
  'retryable failure clears lease', 'failed receipt can dead-letter', 'controlled replay creates an audited child',
]));
check('package exposes Layer 3.3 lifecycle audit', packageJson.scripts['qa:meta-platform-phase31-receipt-lifecycle'] === 'node scripts/meta-platform-phase31-receipt-lifecycle-audit.mjs');
check('aggregate persistence QA includes Layer 3.3 lifecycle audit through the deterministic wrapper', packageJson.scripts['qa:phase31-meta-persistence'] === 'node scripts/meta-v6-phase31-persistence-audit.mjs' && read('scripts/meta-v6-phase31-audit-contract.mjs').includes("'qa:meta-platform-phase31-receipt-lifecycle'"));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 receipt lifecycle audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
