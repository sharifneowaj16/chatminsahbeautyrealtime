#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const includesAll = (source, values) => values.every((value) => source.includes(value));

const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260724233000_phase31_unified_webhook_receipts/migration.sql');
const recovery = read('prisma/migrations/20260724233000_phase31_unified_webhook_receipts/recovery.sql');
const migrationReadme = read('prisma/migrations/20260724233000_phase31_unified_webhook_receipts/README.md');
const repository = read('lib/meta-platform/repositories/webhook-receipts.ts');
const prismaAdapter = read('lib/meta-platform/repositories/prisma-webhook-receipts.ts');
const repositoryIndex = read('lib/meta-platform/repositories/index.ts');
const leadReceipt = read('lib/meta/leads/receipt.ts');
const instagramMessages = read('lib/meta/instagram/messages.ts');
const packageJson = JSON.parse(read('package.json'));

const model = schema.match(/model MetaSocialWebhookReceipt \{[\s\S]*?\n\}/)?.[0] ?? '';
check('schema adds one canonical Meta social webhook receipt model', Boolean(model));
check('schema supports all three Phase 31 social webhook platforms', includesAll(schema, [
  'enum MetaSocialWebhookPlatform', 'LEAD_ADS', 'INSTAGRAM', 'FACEBOOK_PAGE',
]));
check('schema uses the existing environment scope and explicit connection key', includesAll(model, [
  'environment         MetaPlatformEnvironment', 'connectionKey       String',
]));
check('schema carries provider delivery and deterministic event identities', includesAll(model, [
  'providerDeliveryId', 'providerEventKey',
]));
check('schema carries digest, mismatch, duplicate and first/last-seen evidence', includesAll(model, [
  'payloadDigest', 'lastPayloadDigest', 'digestMismatchCount', 'duplicateCount', 'firstSeenAt', 'lastSeenAt',
]));
check('schema carries canonical receipt processing states', includesAll(schema, [
  'enum MetaSocialWebhookReceiptState', 'RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'BLOCKED', 'FAILED', 'DEAD_LETTERED',
]));
check('schema reserves queue, failure, retry, dead-letter and correlation metadata', includesAll(model, [
  'queueName', 'jobReference', 'attemptCount', 'lastAttemptAt', 'nextRetryAt',
  'failureCode', 'failureCategory', 'failureSummary', 'deadLetteredAt', 'correlationId',
]));
check('schema carries replay parent and legacy compatibility references', includesAll(model, [
  'parentReceiptId', 'replayAttempt', 'replayReason', 'replayRequestedBy', 'replayRequestedAt',
  'legacyReceiptType', 'legacyReceiptId', 'MetaSocialWebhookReplay',
]));
check('schema DB dedupe boundary is provider/platform/environment/connection/event scoped', model.includes('@@unique([provider, platform, environment, connectionKey, providerEventKey], map: "MetaSocialWebhookReceipt_dedupe_scope_key")'));
check('schema includes real receipt access indexes', includesAll(model, [
  'MetaSocialWebhookReceipt_state_retry_idx', 'MetaSocialWebhookReceipt_platform_received_idx',
  'MetaSocialWebhookReceipt_connection_received_idx', 'MetaSocialWebhookReceipt_correlation_idx',
  'MetaSocialWebhookReceipt_delivery_idx', 'MetaSocialWebhookReceipt_parent_idx',
]));
check('canonical schema has no raw body, message text, token or encrypted payload column', !/\b(rawBody|rawPayload|messageText|accessToken|appSecret|payloadEncrypted)\b/.test(model));

check('migration creates only additive canonical receipt types/table', includesAll(migration, [
  'CREATE TYPE "MetaSocialWebhookProvider"', 'CREATE TYPE "MetaSocialWebhookPlatform"',
  'CREATE TYPE "MetaSocialWebhookReceiptState"', 'CREATE TABLE "MetaSocialWebhookReceipt"',
]));
check('migration does not alter or drop legacy receipt tables', !/ALTER TABLE "(?:MetaWebhookReceipt|MetaInstagramWebhookReceipt|FbWebhookAudit)"/.test(migration)
  && !/DROP TABLE .*"(?:MetaWebhookReceipt|MetaInstagramWebhookReceipt|FbWebhookAudit)"/.test(migration));
check('migration includes a duplicate detection precondition before unique index creation', migration.indexOf('HAVING COUNT(*) > 1') >= 0
  && migration.indexOf('HAVING COUNT(*) > 1') < migration.indexOf('CREATE UNIQUE INDEX "MetaSocialWebhookReceipt_dedupe_scope_key"'));
check('migration enforces digest, metadata, count, ordering and replay checks', includesAll(migration, [
  'MetaSocialWebhookReceipt_payload_digest', 'MetaSocialWebhookReceipt_safe_metadata',
  'MetaSocialWebhookReceipt_counts', 'MetaSocialWebhookReceipt_seen_order',
  'MetaSocialWebhookReceipt_replay_parent', 'MetaSocialWebhookReceipt_legacy_pair',
]));
check('migration creates the scoped dedupe and query indexes', includesAll(migration, [
  'MetaSocialWebhookReceipt_dedupe_scope_key', 'MetaSocialWebhookReceipt_state_retry_idx',
  'MetaSocialWebhookReceipt_connection_received_idx', 'MetaSocialWebhookReceipt_correlation_idx',
]));
check('migration creates a controlled self replay foreign key', includesAll(migration, [
  'MetaSocialWebhookReceipt_parentReceiptId_fkey', 'REFERENCES "MetaSocialWebhookReceipt"("id")', 'ON DELETE SET NULL',
]));
check('recovery explicitly warns that canonical receipt evidence is destructive', /DESTRUCTIVE PRE-CUTOVER RECOVERY ONLY/.test(recovery)
  && /PRECONDITION/.test(recovery) && /forward-fix/.test(recovery));
check('recovery removes only the additive canonical objects', includesAll(recovery, [
  'DROP TABLE IF EXISTS "MetaSocialWebhookReceipt"', 'DROP TYPE IF EXISTS "MetaSocialWebhookReceiptState"',
]) && !/DROP TABLE IF EXISTS "(?:MetaWebhookReceipt|MetaInstagramWebhookReceipt|FbWebhookAudit)"/.test(recovery));
check('migration README documents dedupe, payload policy, compatibility and recovery', includesAll(migrationReadme, [
  'Dedupe boundary', 'Payload policy', 'Compatibility', 'Recovery warning',
]));

check('repository exposes canonical platforms, states and a bounded safe metadata allowlist', includesAll(repository, [
  'META_SOCIAL_WEBHOOK_PLATFORMS', 'META_SOCIAL_WEBHOOK_RECEIPT_STATES',
  'META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS', 'SAFE_METADATA_MAX_BYTES',
]));
check('repository allowlist excludes tokens, PII, text, raw payload and signed URLs', !/META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS[\s\S]*?(?:access_token|app_secret|authorization|email|phone|\btext\b|rawPayload|sourceUrl)/.test(repository.split('] as const);')[0] ?? ''));
check('repository validates environment, connection, event key, digest, correlation and replay parent', includesAll(repository, [
  'META_SOCIAL_WEBHOOK_ENVIRONMENT_INVALID', 'META_SOCIAL_WEBHOOK_CONNECTION_KEY_INVALID',
  'META_SOCIAL_WEBHOOK_EVENT_KEY_INVALID', 'META_SOCIAL_WEBHOOK_DIGEST_INVALID',
  'META_SOCIAL_WEBHOOK_CORRELATION_INVALID', 'META_SOCIAL_WEBHOOK_INITIAL_STATE_INVALID',
  'META_SOCIAL_WEBHOOK_REPLAY_PARENT_REQUIRED',
]));
check('repository insert is database-atomic with the exact scoped ON CONFLICT boundary', includesAll(repository, [
  'INSERT INTO "MetaSocialWebhookReceipt"',
  'ON CONFLICT ("provider", "platform", "environment", "connectionKey", "providerEventKey")',
  '"duplicateCount" = "MetaSocialWebhookReceipt"."duplicateCount" + 1',
]));
check('repository preserves first digest and surfaces changed duplicate digests', includesAll(repository, [
  '"lastPayloadDigest" = EXCLUDED."payloadDigest"',
  '"digestMismatchCount" = "MetaSocialWebhookReceipt"."digestMismatchCount"',
  'receipt.payloadDigest === normalized.payloadDigest',
]));
check('repository links legacy receipt identity without overwriting a conflicting link', includesAll(repository, [
  'LINK_LEGACY_SQL', 'META_SOCIAL_WEBHOOK_LEGACY_REFERENCE_CONFLICT',
  '"legacyReceiptType" IS NULL AND "legacyReceiptId" IS NULL',
]));
check('dependency-independent in-memory store mirrors scoped dedupe and mismatch behavior', includesAll(repository, [
  'InMemoryMetaSocialWebhookReceiptStore', 'duplicateCount: existing.duplicateCount + 1',
  'digestMismatchCount: existing.digestMismatchCount + (digestMatches ? 0 : 1)',
]));
check('Prisma adapter is server-only and uses raw SQL without requiring generated model freshness', prismaAdapter.startsWith("import 'server-only';")
  && prismaAdapter.includes('prisma.$queryRawUnsafe<T[]>')
  && !prismaAdapter.includes('prisma.metaSocialWebhookReceipt'));
check('repository index exports pure and Prisma-backed boundaries', includesAll(repositoryIndex, [
  'createMetaSocialWebhookReceiptRepository', 'createOrGetMetaSocialWebhookReceipt',
  'linkMetaSocialWebhookLegacyReceipt', 'sanitizeMetaSocialWebhookMetadata',
]));

check('Lead Ads receipt creates canonical receipt before legacy encrypted receipt', includesAll(leadReceipt, [
  "platform: 'LEAD_ADS'", 'createOrGetMetaSocialWebhookReceipt', 'linkMetaSocialWebhookLegacyReceipt',
  "legacyReceiptType: 'MetaWebhookReceipt'", 'safeMetadata:',
]) && leadReceipt.indexOf('await createOrGetMetaSocialWebhookReceipt') < leadReceipt.indexOf('const encrypted = encryptMetaLeadPayload'));
check('Lead Ads canonical metadata excludes raw Lead fields and token material', !/safeMetadata:\s*\{[\s\S]*?(?:rawPayload|rawFields|email|phone|accessToken|appSecret)/.test(leadReceipt.match(/safeMetadata:\s*\{[\s\S]*?\n\s*\},/)?.[0] ?? ''));
check('rejected Lead Ads events persist a blocked canonical receipt with a safe reason code', includesAll(leadReceipt, [
  "initialState: 'BLOCKED'", "eventType: 'REJECTED'", 'rejectionCode: input.code',
]));
check('Instagram receipt creates canonical receipt before legacy lookup/write', includesAll(instagramMessages, [
  "platform: 'INSTAGRAM'", 'createOrGetMetaSocialWebhookReceipt', 'linkMetaSocialWebhookLegacyReceipt',
  "legacyReceiptType: 'MetaInstagramWebhookReceipt'", 'safeMetadata:',
]) && instagramMessages.indexOf('await createOrGetMetaSocialWebhookReceipt') < instagramMessages.indexOf('metaInstagramWebhookReceipt.findUnique'));
check('Instagram canonical metadata does not persist message text or attachment URLs', !/safeMetadata:\s*\{[\s\S]*?(?:text:|attachments:|sourceUrl|thumbnailUrl|accessToken)/.test(instagramMessages.match(/safeMetadata:\s*\{[\s\S]*?\n\s*\},/)?.[0] ?? ''));

check('package exposes focused Phase 31 persistence test', packageJson.scripts['test:meta-v6-phase31-persistence'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-meta-social-crm-persistence.test.mjs');
check('package exposes focused Phase 31 persistence audit', packageJson.scripts['qa:meta-platform-phase31-persistence'] === 'node scripts/meta-platform-phase31-persistence-audit.mjs');
const persistenceWrapper = fs.readFileSync('scripts/meta-v6-phase31-persistence-audit.mjs', 'utf8');
const phase31AuditContract = fs.readFileSync('scripts/meta-v6-phase31-audit-contract.mjs', 'utf8');
check('package exposes deterministic persistence QA wrapper with receipt, identity, storage, queue and migration checks', packageJson.scripts['qa:phase31-meta-persistence'] === 'node scripts/meta-v6-phase31-persistence-audit.mjs' && persistenceWrapper.includes("runPhase31StaticAuditCli('persistence')") && [
  "'test:meta-v6-phase31-persistence'",
  "'qa:meta-platform-phase31-receipt-lifecycle'",
  "'test:meta-v6-phase31-provider-identities'",
  "'test:meta-v6-phase31-lead-storage'",
  "'test:meta-v6-phase31-instagram-storage'",
  "'test:meta-v6-phase31-payload-replay'",
  "'test:meta-v6-phase31-layer4.8'",
  "'qa:prisma-schema-migration-pair'",
  "'qa:meta-v6-migrations'",
].every((value) => phase31AuditContract.includes(value)));

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
}
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 persistence audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
