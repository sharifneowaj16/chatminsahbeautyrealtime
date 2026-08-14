#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const schema = read('prisma/schema.prisma');
const externalReference = schema.match(/model MetaExternalReference \{[\s\S]*?\n\}/)?.[0] ?? '';
const relationshipModel = schema.match(/model MetaProviderIdentityRelationship \{[\s\S]*?\n\}/)?.[0] ?? '';
const receiptModel = schema.match(/model MetaSocialWebhookReceipt \{[\s\S]*?\n\}/)?.[0] ?? '';
const migrationDir = 'prisma/migrations/20260725033000_phase31_provider_identity_mapping';
const migration = read(`${migrationDir}/migration.sql`);
const recovery = read(`${migrationDir}/recovery.sql`);
const migrationReadme = read(`${migrationDir}/README.md`);
const identities = read('lib/meta-platform/repositories/provider-identities.ts');
const relationships = read('lib/meta-platform/repositories/provider-identity-relationships.ts');
const prismaRepository = read('lib/meta-platform/repositories/prisma-provider-identities.ts');
const webhookIdentities = read('lib/meta-platform/repositories/webhook-provider-identities.ts');
const pageIdentities = read('lib/meta-platform/repositories/page-identities.ts');
const instagramIdentities = read('lib/meta-platform/repositories/instagram-identities.ts');
const formIdentities = read('lib/meta-platform/repositories/lead-form-identities.ts');
const backfill = read('lib/meta-platform/repositories/provider-identity-backfill.ts');
const leadReceipt = read('lib/meta/leads/receipt.ts');
const instagramReceipt = read('lib/meta/instagram/messages.ts');
const instagramService = read('lib/meta/instagram/service.ts');
const receiptRepository = read('lib/meta-platform/repositories/webhook-receipts.ts');
const lifecycle = read('lib/meta-platform/repositories/webhook-receipt-lifecycle.ts');
const tests = read('tests/meta-v6/phase31-provider-identity-mapping.test.mjs');
const packageJson = JSON.parse(read('package.json'));

const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const includesAll = (value, needles) => needles.every((needle) => value.includes(needle));

check('schema defines provider identity lifecycle enum', includesAll(schema, ['enum MetaProviderIdentityStatus', 'UNVERIFIED', 'ACTIVE', 'INACTIVE', 'REVOKED']));
check('schema defines identity-specific permission-health enum', includesAll(schema, ['enum MetaProviderPermissionHealth', 'UNKNOWN', 'HEALTHY', 'DEGRADED', 'MISSING_PERMISSION', 'BLOCKED']));
check('schema defines all five typed relationship kinds', includesAll(schema, [
  'APP_ASSOCIATED_WITH_BUSINESS', 'BUSINESS_OWNS_PAGE', 'BUSINESS_OWNS_AD_ACCOUNT',
  'PAGE_LINKED_INSTAGRAM_ACCOUNT', 'PAGE_CONTAINS_LEAD_FORM',
]));
check('existing MetaExternalReference is extended rather than replaced', includesAll(externalReference, [
  'identityStatus', 'permissionHealth', 'permissionMetadata', 'lastSeenAt', 'disabledAt', 'revokedAt', 'statusReason',
]));
check('identity selection and health indexes are scoped and explicit', includesAll(externalReference, [
  'MetaExternalReference_identity_select_idx', 'MetaExternalReference_identity_health_idx',
]));
check('typed relationship model stores environment and connection scope', includesAll(relationshipModel, [
  'environment', 'connectionKey', 'relationshipType', 'parentReferenceId', 'childReferenceId',
]));
check('typed relationship model has one DB unique edge boundary', relationshipModel.includes('MetaProviderIdentityRelationship_scope_edge_key'));
check('typed relationship model indexes parent and child lookup directions', includesAll(relationshipModel, [
  'MetaProviderIdentityRelationship_parent_idx', 'MetaProviderIdentityRelationship_child_idx',
]));
check('typed relationships retain disabled/revoked audit state', includesAll(relationshipModel, ['disabledAt', 'revokedAt', 'statusReason', 'lastVerifiedAt']));
check('receipt has nullable canonical primary identity relation', includesAll(receiptModel, ['primaryIdentityReferenceId', 'primaryIdentityReference', 'MetaSocialWebhookPrimaryIdentity']));
check('receipt primary identity is indexed', receiptModel.includes('MetaSocialWebhookReceipt_primary_identity_idx'));
check('Layer 3.2 receipt dedupe boundary remains unchanged', receiptModel.includes('MetaSocialWebhookReceipt_dedupe_scope_key'));

check('migration is additive for reference identity fields', includesAll(migration, [
  'ALTER TABLE "MetaExternalReference"', 'ADD COLUMN "identityStatus"', 'ADD COLUMN "permissionHealth"',
]));
check('migration leaves existing references unverified instead of guessing health', includesAll(migration, ['remain UNVERIFIED/UNKNOWN', 'does not guess provider health']) || migration.includes('Existing generic references deliberately remain UNVERIFIED/UNKNOWN'));
check('migration creates a typed relationship table', includesAll(migration, ['CREATE TABLE "MetaProviderIdentityRelationship"', 'MetaProviderIdentityRelationship_distinct_refs_check']));
check('migration documents duplicate edge detection before uniqueness', includesAll(migration, ['GROUP BY 1,2,3,4,5 HAVING COUNT(*) > 1', 'scope_edge_key']));
check('migration creates relationship foreign keys with restrictive deletes', includesAll(migration, ['parentReferenceId_fkey', 'childReferenceId_fkey', 'ON DELETE RESTRICT']));
check('migration adds receipt identity FK with SET NULL recovery semantics', includesAll(migration, ['primaryIdentityReferenceId_fkey', 'ON DELETE SET NULL']));
check('migration does not alter legacy Lead or Instagram receipt tables', !/ALTER TABLE "(?:MetaWebhookReceipt|MetaInstagramWebhookReceipt|MetaLead|MetaConversation|MetaMessage)"/.test(migration));
check('recovery removes only Layer 3.4 relationship and identity additions', includesAll(recovery, [
  'DROP TABLE IF EXISTS "MetaProviderIdentityRelationship"', 'DROP COLUMN IF EXISTS "identityStatus"',
  'DROP COLUMN IF EXISTS "primaryIdentityReferenceId"',
]) && !recovery.includes('DROP TABLE IF EXISTS "MetaExternalReference"') && !recovery.includes('DROP TABLE IF EXISTS "MetaSocialWebhookReceipt"'));
check('recovery warns operators to stop identity attachment and export relationships', includesAll(recovery, ['Stop webhook/worker processes', 'Export any MetaProviderIdentityRelationship rows']));
check('migration README rejects automatic environment inference', includesAll(migrationReadme, ['has no environment field', 'does not guess provider health']));

check('provider identities reuse PROVIDER_IDENTITY object type in MetaExternalReference', identities.includes("META_PROVIDER_IDENTITY_OBJECT_TYPE = 'PROVIDER_IDENTITY'"));
check('provider identity asset list covers App, Business, Ad account, Page, Instagram and Lead Form', includesAll(identities, ["'APP'", "'BUSINESS'", "'AD_ACCOUNT'", "'PAGE'", "'INSTAGRAM_ACCOUNT'", "'LEAD_FORM'"]));
check('identity metadata is allowlisted rather than raw-payload persisted', includesAll(identities, ['SAFE_METADATA_KEYS', 'sanitizeMetaProviderIdentityMetadata']) && !identities.includes('JSON.stringify(input.rawPayload)'));
check('identity metadata denylist covers tokens, secrets, PII, messages and signed URLs', identities.includes('access.?token|app.?secret|authorization|cookie|password|signed.?url|email|phone|message|raw.?payload'));
check('permission metadata accepts only required, granted and missing arrays', includesAll(identities, ["'required'", "'granted'", "'missing'", 'sanitizeMetaProviderPermissionMetadata']));
check('identity registration requires exact explicit asset context', includesAll(identities, ['META_PROVIDER_IDENTITY_CONTEXT_MISMATCH', 'input.context.assets']));
check('same provider ID is scoped by environment, connection and asset type', identities.includes("[input.environment, input.connectionKey.trim(), input.assetType, input.providerId.trim()]"));
check('revoked identity state is terminal', includesAll(identities, ["current === 'REVOKED'", 'META_PROVIDER_IDENTITY_STATUS_TRANSITION_INVALID']));
check('write selection requires ACTIVE and HEALTHY', identities.includes("record.identityStatus === 'ACTIVE' && record.permissionHealth === 'HEALTHY'"));
check('receipt identity compatibility enforces platform asset type and scope', includesAll(identities, ['assertMetaProviderIdentityReceiptCompatibility', 'META_PROVIDER_IDENTITY_RECEIPT_SCOPE_MISMATCH', 'META_PROVIDER_IDENTITY_RECEIPT_TYPE_MISMATCH']));

check('relationship matrix enforces all allowed parent-child asset pairs', includesAll(relationships, [
  "APP_ASSOCIATED_WITH_BUSINESS: Object.freeze(['APP', 'BUSINESS'])",
  "BUSINESS_OWNS_PAGE: Object.freeze(['BUSINESS', 'PAGE'])",
  "BUSINESS_OWNS_AD_ACCOUNT: Object.freeze(['BUSINESS', 'AD_ACCOUNT'])",
  "PAGE_LINKED_INSTAGRAM_ACCOUNT: Object.freeze(['PAGE', 'INSTAGRAM_ACCOUNT'])",
  "PAGE_CONTAINS_LEAD_FORM: Object.freeze(['PAGE', 'LEAD_FORM'])",
]));
check('relationships reject cross-environment or cross-connection links', relationships.includes('META_PROVIDER_IDENTITY_RELATION_SCOPE_MISMATCH'));
check('relationships reject reversed/unrelated asset pairs', relationships.includes('META_PROVIDER_RELATION_ASSET_PAIR_INVALID'));
check('relationships reject links to revoked identities', relationships.includes('META_PROVIDER_RELATION_REVOKED_IDENTITY'));
check('relationship in-memory repository is idempotent by typed edge', includesAll(relationships, ['relationKey', 'this.#byKey.get(key)', 'existing?.id ?? this.#createId()']));

check('Prisma identity registration uses DB upsert on existing external-reference scope', includesAll(prismaRepository, [
  'INSERT INTO "MetaExternalReference"', 'ON CONFLICT ("environment", "connectionKey", "assetType", "assetId", "objectType", "localId")',
]));
check('Prisma identity registration cannot reopen revoked identities', prismaRepository.includes("identityStatus\"='REVOKED'") && prismaRepository.includes('META_PROVIDER_IDENTITY_CONFLICT'));
check('Prisma relation registration uses the DB edge unique boundary', includesAll(prismaRepository, ['INSERT INTO "MetaProviderIdentityRelationship"', 'ON CONFLICT ("environment", "connectionKey", "relationshipType", "parentReferenceId", "childReferenceId")']));
check('Prisma receipt attachment is null-or-same and conflict guarded', includesAll(prismaRepository, ['primaryIdentityReferenceId === identity.id', '"primaryIdentityReferenceId" IS NULL', 'META_PROVIDER_IDENTITY_RECEIPT_CONFLICT']));
check('backfill requires explicit environment and connection key', includesAll(backfill, ['environment:', 'connectionKey:', 'META_BACKFILL_CONNECTION_MISMATCH']));
check('backfill does not invent Business ownership when Business is absent', includesAll(backfill, ["present.has('BUSINESS') && present.has('PAGE')", "present.has('BUSINESS') && present.has('AD_ACCOUNT')"]));
check('backfill uses UNVERIFIED and UNKNOWN safe defaults', includesAll(backfill, ["identityStatus: 'UNVERIFIED'", "permissionHealth: 'UNKNOWN'"]));

check('Page wrapper rejects inactive/revoked identities and gates writes', includesAll(pageIdentities, ['META_PROVIDER_IDENTITY_REVOKED', 'META_PROVIDER_IDENTITY_INACTIVE', 'META_PROVIDER_IDENTITY_NOT_WRITABLE']));
check('Instagram wrapper verifies exact Page to Instagram edge', includesAll(instagramIdentities, ['PAGE_LINKED_INSTAGRAM_ACCOUNT', 'META_PROVIDER_RELATION_MISMATCH']));
check('Lead Form wrapper verifies exact Page to Form edge', includesAll(formIdentities, ['PAGE_CONTAINS_LEAD_FORM', 'META_PROVIDER_RELATION_MISMATCH']));

check('Lead receipt registers and attaches Page/Form identity before legacy processing', includesAll(leadReceipt, ['persistMetaLeadWebhookProviderIdentity', 'pageConfigured:', 'formAllowlisted:']) && leadReceipt.indexOf('persistMetaLeadWebhookProviderIdentity') < leadReceipt.indexOf('encryptMetaLeadPayload'));
check('Instagram receipt resolves configured identity before legacy receipt creation', includesAll(instagramReceipt, ['persistInstagramWebhookProviderIdentity', 'identityBlockedCode', 'markMetaSocialWebhookReceiptBlocked']) && instagramReceipt.indexOf('persistInstagramWebhookProviderIdentity') < instagramReceipt.indexOf('metaInstagramWebhookReceipt.findUnique'));
check('Instagram identity mismatch is surfaced as a rejected handoff rather than queued', includesAll(instagramService, ['stored.identityBlockedCode', "disposition: 'REJECTED'", "outcome: 'identity_blocked'"]));
check('webhook identity service attaches Lead Form as primary when present', includesAll(webhookIdentities, ['primary = form', 'attachMetaSocialWebhookPrimaryIdentity']));
check('webhook identity service attaches Instagram account as primary', includesAll(webhookIdentities, ['primary: instagram', 'identityId: instagram.id']));
check('webhook identity service verifies configured Instagram/Page scope', includesAll(webhookIdentities, ['META_PROVIDER_IDENTITY_SCOPE_MISMATCH', 'configuredInstagramAccountId', 'configuredPageId']));

check('receipt row contract and lifecycle SELECT include primary identity reference', receiptRepository.includes('primaryIdentityReferenceId: string | null') && lifecycle.includes("'primaryIdentityReferenceId'"));
check('focused runtime tests cover secret redaction, scope isolation, relation matrix, revocation and backfill', includesAll(tests, [
  'allowlisted and secret-free', 'different environment and connection scopes', 'relationship asset matrix',
  'revoked identities are terminal', 'backfill is deterministic',
]));
check('package exposes focused provider identity test', packageJson.scripts['test:meta-v6-phase31-provider-identities'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-provider-identity-mapping.test.mjs');
check('package exposes provider identity audit', packageJson.scripts['qa:meta-platform-phase31-provider-identities'] === 'node scripts/meta-platform-phase31-provider-identity-audit.mjs');
check('aggregate persistence QA includes Layer 3.4 runtime and static gates through the deterministic wrapper', packageJson.scripts['qa:phase31-meta-persistence'] === 'node scripts/meta-v6-phase31-persistence-audit.mjs' && includesAll(read('scripts/meta-v6-phase31-audit-contract.mjs'), ["'test:meta-v6-phase31-provider-identities'", "'qa:meta-platform-phase31-provider-identities'"]));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 provider identity audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
