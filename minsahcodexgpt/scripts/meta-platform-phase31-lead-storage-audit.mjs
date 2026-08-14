#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const includesAll = (source, values) => values.every((value) => source.includes(value));

const schema = read('prisma/schema.prisma');
const migrationDir = 'prisma/migrations/20260725063000_phase31_lead_normalized_storage';
const migration = read(`${migrationDir}/migration.sql`);
const recovery = read(`${migrationDir}/recovery.sql`);
const migrationReadme = read(`${migrationDir}/README.md`);
const leads = read('lib/meta-platform/repositories/leads.ts');
const prismaLeads = read('lib/meta-platform/repositories/prisma-leads.ts');
const leadReceipts = read('lib/meta-platform/repositories/lead-receipts.ts');
const leadAttribution = read('lib/meta-platform/repositories/lead-attribution.ts');
const leadHandoffs = read('lib/meta-platform/repositories/lead-handoffs.ts');
const repositoryIndex = read('lib/meta-platform/repositories/index.ts');
const legacyFacade = read('lib/meta/leads/service.ts');
const domainService = read('lib/meta-platform/domains/leads/runtime.ts');
const rollbackService = read('lib/meta/leads/legacy-service.ts');
const service = `${legacyFacade}\n${domainService}\n${rollbackService}`;
const config = read('lib/meta/leads/config.ts');
const types = read('lib/meta/leads/types.ts');
const receiptRepository = read('lib/meta-platform/repositories/webhook-receipts.ts');
const tests = read('tests/meta-v6/phase31-lead-normalized-storage.test.mjs');
const packageJson = JSON.parse(read('package.json'));
const processService = domainService.slice(domainService.indexOf('export async function processMetaLeadReceipt'), domainService.indexOf('export async function runMetaLeadReceiptRecovery'));

const receiptModel = schema.match(/model MetaSocialWebhookReceipt \{[\s\S]*?\n\}/)?.[0] ?? '';
const leadModel = schema.match(/model MetaLead \{[\s\S]*?\n\}/)?.[0] ?? '';
const attemptModel = schema.match(/model MetaLeadProcessingAttempt \{[\s\S]*?\n\}/)?.[0] ?? '';
const handoffModel = schema.match(/model MetaLeadHandoff \{[\s\S]*?\n\}/)?.[0] ?? '';
const duplicateModel = schema.match(/model MetaLeadDuplicate \{[\s\S]*?\n\}/)?.[0] ?? '';

check('schema preserves MetaLead provider lead ID uniqueness', leadModel.includes('leadgenId             String                  @unique'));
check('schema adds canonical receipt to normalized Lead relation', includesAll(receiptModel, ['normalizedLeadId', 'MetaSocialWebhookNormalizedLead', 'MetaSocialWebhookReceipt_normalized_lead_idx']));
check('schema adds one processing attempt per canonical receipt', includesAll(attemptModel, ['receiptId               String                  @unique', 'MetaSocialWebhookReceipt', 'onDelete: Restrict']));
check('processing attempt persists provider/environment/connection scope', includesAll(attemptModel, ['providerLeadId', 'environment', 'connectionKey']));
check('processing attempt persists Page and Lead Form identity references', includesAll(attemptModel, ['pageIdentityReferenceId', 'formIdentityReferenceId', 'MetaLeadAttemptPageIdentity', 'MetaLeadAttemptFormIdentity']));
check('processing attempt persists retrieval attempts, retry time and safe failure', includesAll(attemptModel, ['retrievalStatus', 'retrievalAttempt', 'lastRetrievalAt', 'nextRetrievalAt', 'failureCode', 'failureCategory', 'failureSummary']));
check('processing attempt can trace normalized Lead and duplicate reason', includesAll(attemptModel, ['normalizedLeadId', 'duplicateReason', 'isTestLead']));
check('schema adds replay-safe Lead handoff model', includesAll(handoffModel, ['idempotencyKey String                     @unique', 'MetaLeadHandoff_lead_destination_key', 'MetaLeadHandoff_retry_idx']));
check('handoff destination enum covers future CRM/contact/order boundaries', includesAll(schema, ['enum MetaLeadHandoffDestination', 'INTERNAL_CRM', 'CUSTOMER', 'CONTACT', 'ORDER', 'ADMIN_ASSIGNMENT']));
check('MetaLead carries optional canonical scope and Page/Form identity FKs', includesAll(leadModel, ['environment', 'connectionKey', 'pageIdentityReferenceId', 'formIdentityReferenceId']));
check('MetaLead keeps legacy hashes while adding versioned keyed fingerprints', includesAll(leadModel, ['normalizedPhoneHash', 'normalizedEmailHash', 'phoneFingerprint', 'emailFingerprint', 'fingerprintVersion']));
check('MetaLead test marker is nullable', leadModel.includes('isTestLead            Boolean?'));
check('MetaLead duplicate retains legacy receipt and adds canonical receipt FK', includesAll(duplicateModel, ['receiptId', 'canonicalReceiptId', 'MetaLeadDuplicateCanonicalReceipt']));

check('migration is additive and creates only Layer 3.5 enums/tables/columns', includesAll(migration, ['CREATE TYPE "MetaLeadHandoffDestination"', 'CREATE TABLE "MetaLeadProcessingAttempt"', 'CREATE TABLE "MetaLeadHandoff"', 'ALTER TABLE "MetaLead"', 'ALTER TABLE "MetaSocialWebhookReceipt"']));
check('migration does not drop or rename existing Lead/receipt tables', !/DROP TABLE\s+"(?:MetaLead|MetaWebhookReceipt|MetaSocialWebhookReceipt)"/.test(migration) && !/RENAME (?:TABLE|COLUMN)/.test(migration));
check('migration documents provider Lead duplicate precondition before unique attempt/handoff indexes', migration.indexOf('SELECT "leadgenId", COUNT(*)') >= 0 && migration.indexOf('SELECT "leadgenId", COUNT(*)') < migration.indexOf('CREATE UNIQUE INDEX "MetaLeadProcessingAttempt_receiptId_key"'));
check('migration enforces receipt attempt uniqueness', includesAll(migration, ['MetaLeadProcessingAttempt_receiptId_key', 'FOREIGN KEY ("receiptId") REFERENCES "MetaSocialWebhookReceipt"']));
check('migration enforces Lead handoff destination idempotency', includesAll(migration, ['MetaLeadHandoff_idempotencyKey_key', 'MetaLeadHandoff_lead_destination_key']));
check('migration enforces scoped Lead/fingerprint consistency', includesAll(migration, ['MetaLead_scope_pair_check', 'MetaLead_fingerprint_version_check']));
check('migration adds Page/Form identity foreign keys without destructive deletes', includesAll(migration, ['MetaLead_pageIdentityReferenceId_fkey', 'MetaLead_formIdentityReferenceId_fkey', 'ON DELETE SET NULL']));
check('migration links receipt and duplicate rows to canonical Lead/receipt', includesAll(migration, ['MetaSocialWebhookReceipt_normalizedLeadId_fkey', 'MetaLeadDuplicate_canonicalReceiptId_fkey']));
check('migration backfill is deterministic and resumable', includesAll(migration, ["'phase31-lead-attempt:' || canonical.\"id\"", 'ON CONFLICT ("receiptId") DO NOTHING', 'HAVING COUNT(DISTINCT']));
check('migration does not guess ambiguous environment or connection scope', includesAll(migration, ['Historical', 'unambiguous canonical receipt matches']) || migration.includes('unambiguous canonical receipt matches'));
check('migration does not attempt plaintext PII fingerprint backfill', !/UPDATE "MetaLead"[\s\S]*SET "(?:phoneFingerprint|emailFingerprint)"/.test(migration));
check('recovery preserves existing MetaLead and legacy receipts', !recovery.includes('DROP TABLE IF EXISTS "MetaLead"') && !recovery.includes('DROP TABLE IF EXISTS "MetaWebhookReceipt"') && !recovery.includes('DROP TABLE IF EXISTS "MetaSocialWebhookReceipt"'));
check('recovery warns to stop Lead and handoff processes and export audit rows', includesAll(recovery, ['Stop Lead webhook, worker, replay, assignment, and CRM handoff processes', 'Export MetaLeadProcessingAttempt and MetaLeadHandoff']));
check('migration README states Lead ID authority and no historical live/test guess', includesAll(migrationReadme, ['MetaLead.leadgenId', 'isTestLead', 'not falsely classified']));
check('migration README separates durable handoff storage from Layer 5.3 execution', includesAll(migrationReadme, ['durable references only', 'Layer 5.3']));

check('keyed fingerprints use HMAC SHA-256 with environment and connection scope', includesAll(leads, ['createHmac', 'META_LEAD_FINGERPRINT_VERSION', 'input.environment', 'connectionKey', 'input.kind']));
check('fingerprint storage never returns plaintext normalized identity', leads.includes(".digest('hex')") && !leads.includes('return input.normalizedValue'));
check('Lead safe failure sanitization redacts tokens, URLs, email and phone', includesAll(leads, ['[REDACTED]', '[REDACTED_URL]', '[REDACTED_EMAIL]', '[REDACTED_PHONE]']));
check('Lead attribution uses an allowlist and excludes raw secret/PII keys', includesAll(leads, ['sanitizeMetaLeadAttribution', 'const allowed = new Set', 'SECRET_PATTERN']));
check('in-memory attempt is idempotent by receipt and rejects provider/scope mutation', includesAll(leads, ['META_LEAD_ATTEMPT_RECEIPT_CONFLICT', 'this.#attempts.get(receiptId)']));
check('in-memory retrieval transition persists attempts and failures', includesAll(leads, ['markFetching', 'retrievalAttempt: row.retrievalAttempt + 1', 'markFailure']));
check('in-memory storage dedupes provider then phone then email', includesAll(leads, ['byProvider ?? byPhone ?? byEmail', "byProvider ? 'LEADGEN_ID'", "byPhone ? 'PHONE'", "byEmail ? 'EMAIL'"]));
check('in-memory replay reuses deterministic Lead handoff', includesAll(leads, ['buildMetaLeadHandoffIdempotencyKey', 'this.#handoffs.get(key)']));

check('Prisma begin-attempt requires canonical Lead Ads receipt and exact scope', includesAll(prismaLeads, ['MetaLeadProcessingAttempt', "platform\"='LEAD_ADS'", 'environment\"=$4', 'connectionKey\"=$5']));
check('Prisma attempt conflict cannot silently change provider or scope', includesAll(prismaLeads, ['providerLeadId\"=EXCLUDED', 'environment\"=EXCLUDED', 'connectionKey\"=EXCLUDED']));
check('Prisma retrieval state increments attempts and persists safe failure', includesAll(prismaLeads, ['retrievalAttempt\"=\"retrievalAttempt\"+1', 'sanitizeMetaLeadFailure', 'nextRetrievalAt']));
check('Prisma identity resolver registers Page/Form and exact typed relationship', includesAll(prismaLeads, ['PAGE_CONTAINS_LEAD_FORM', 'pageIdentityReferenceId', 'formIdentityReferenceId', 'META_LEAD_RECEIPT_IDENTITY_MISMATCH']));
check('Prisma persistence takes provider and fingerprint advisory locks', includesAll(prismaLeads, ['pg_advisory_xact_lock', 'meta-lead-provider:', 'meta-lead-phone:', 'meta-lead-email:']));
check('Prisma provider Lead ID remains DB upsert authority', includesAll(prismaLeads, ['ON CONFLICT ("leadgenId") DO UPDATE', 'META_LEAD_PROVIDER_SCOPE_CONFLICT']));
check('Prisma fingerprint lookup is scoped and legacy hash fallback is scope bounded', includesAll(prismaLeads, ['phoneFingerprint', 'emailFingerprint', 'environment\"=$6', 'connectionKey\"=$7']));
check('Prisma duplicate mapping records canonical receipt and refuses remap', includesAll(prismaLeads, ['canonicalReceiptId', 'META_LEAD_DUPLICATE_MAPPING_CONFLICT', 'canonicalLeadId\"=EXCLUDED']));
check('Prisma receipt-to-Lead attachment is null-or-same guarded', includesAll(prismaLeads, ['normalizedLeadId\" IS NULL OR \"normalizedLeadId\"=$2', 'META_LEAD_RECEIPT_LINK_CONFLICT']));
check('Prisma attempt completion is null-or-same guarded', includesAll(prismaLeads, ['META_LEAD_ATTEMPT_LINK_CONFLICT', 'retrievalStatus\"=\'FETCHED\'']));
check('Prisma creates one deterministic handoff per Lead/destination', includesAll(prismaLeads, ['buildMetaLeadHandoffIdempotencyKey', 'ON CONFLICT ("leadId","destination")']));
check('Prisma writes encrypted payload and safe field-count metadata only', includesAll(prismaLeads, ['encryptedRawPayload', 'safeFields(input.fields)', 'safeNormalized(input.normalized)']) && !prismaLeads.includes('JSON.stringify(input.normalized)'));

check('Lead worker creates attempt before provider fetch', processService.indexOf('beginMetaLeadProcessingAttempt') < processService.indexOf('fetchMetaLeadGraphRecord'));
check('Lead worker marks attempt fetching before Graph fetch', processService.indexOf('markMetaLeadProcessingAttemptFetching') < processService.indexOf('fetchMetaLeadGraphRecord'));
check('Lead worker rejects receipt/fetched Form mismatch', service.includes('META_LEAD_RECEIPT_FORM_MISMATCH'));
check('Lead worker resolves Page/Form identities before persistence', processService.indexOf('ensureMetaLeadStorageIdentities') < processService.indexOf('persistNormalizedMetaLeadStorage'));
check('Lead worker calculates scoped keyed phone/email fingerprints', includesAll(service, ['requireMetaLeadFingerprintSecret', "kind: 'PHONE'", "kind: 'EMAIL'", 'canonical.environment', 'canonical.connectionKey']));
check('Lead worker persists receipt-first normalized Lead and handoff', includesAll(service, ['canonicalReceiptId: canonical.id', 'processingAttemptId: attempt.id', "handoffDestination: 'INTERNAL_CRM'"]));
check('Lead worker writes durable retrieval failure before receipt failure', processService.indexOf('markMetaLeadProcessingAttemptFailed') < processService.indexOf('markMetaSocialWebhookReceiptFailed'));
check('Lead worker resumes post-persistence crash without second provider fetch', includesAll(service, ["fetching.retrievalStatus === 'FETCHED'", 'fetching.normalizedLeadId', 'deduplicated: true']));
check('Lead fingerprint config supports purpose-separated key with safe fallback', includesAll(config, ['META_LEAD_FINGERPRINT_KEY', 'requireMetaLeadEncryptionSecret']));
check('Lead payload contract supports nullable provider test marker', types.includes('is_test_lead?: boolean'));
check('receipt repository row/select contract includes normalized Lead reference', receiptRepository.includes('normalizedLeadId: string | null') && receiptRepository.includes('"normalizedLeadId", "instagramMessageId", "createdAt"'));
check('repository index exports pure and Prisma Lead storage boundaries', includesAll(repositoryIndex, ['InMemoryMetaLeadStorageRepository', 'persistNormalizedMetaLeadStorage', 'beginMetaLeadProcessingAttempt']));
check('thin Lead receipt/attribution/handoff modules expose platform contracts', includesAll(leadReceipts, ['InMemoryMetaLeadStorageRepository']) && includesAll(leadAttribution, ['sanitizeMetaLeadAttribution']) && includesAll(leadHandoffs, ['buildMetaLeadHandoffIdempotencyKey']));

check('focused tests cover fingerprints, PII redaction, attempts, replay, phone/email dedupe, scope and test marker', includesAll(tests, ['fingerprints are deterministic', 'excludes secret and PII', 'one durable processing attempt', 'same provider Lead on replay', 'same phone', 'same email', 'another connection', 'test Lead marker']));
check('package exposes focused Lead normalized storage test', packageJson.scripts['test:meta-v6-phase31-lead-storage'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-lead-normalized-storage.test.mjs');
check('package exposes Lead normalized storage static audit', packageJson.scripts['qa:meta-platform-phase31-lead-storage'] === 'node scripts/meta-platform-phase31-lead-storage-audit.mjs');
check('aggregate persistence QA includes Layer 3.5 runtime and static gates through the deterministic wrapper', packageJson.scripts['qa:phase31-meta-persistence'] === 'node scripts/meta-v6-phase31-persistence-audit.mjs' && includesAll(read('scripts/meta-v6-phase31-audit-contract.mjs'), ["'test:meta-v6-phase31-lead-storage'", "'qa:meta-platform-phase31-lead-storage'"]));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 Lead normalized storage audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
