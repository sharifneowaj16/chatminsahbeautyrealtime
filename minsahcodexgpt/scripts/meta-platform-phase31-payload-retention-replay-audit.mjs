import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const all = (text, values) => values.every((value) => text.includes(value));

const schema = read('prisma/schema.prisma');
const repo = read('lib/meta-platform/repositories/webhook-receipts.ts');
const lifecycle = read('lib/meta-platform/repositories/webhook-receipt-lifecycle.ts');
const signature = read('lib/meta-platform/transports/webhook/signature.ts');
const leadRepo = read('lib/meta-platform/repositories/prisma-leads.ts');
const instagramRepo = read('lib/meta-platform/repositories/prisma-instagram-persistence.ts');
const migrationDir = 'prisma/migrations/20260725123000_phase31_payload_retention_replay_metadata';
const migration = read(`${migrationDir}/migration.sql`);
const recovery = read(`${migrationDir}/recovery.sql`);
const migrationReadme = read(`${migrationDir}/README.md`);
const testFile = read('tests/meta-v6/phase31-payload-retention-replay.test.mjs');

check('canonical raw-body digest remains SHA-256', all(signature, ["createHash('sha256')", '.update(rawBody)', ".digest('hex')"]));
check('receipt sanitizer is allowlist based', all(repo, ['META_SOCIAL_WEBHOOK_SAFE_METADATA_KEYS', 'hasOwnProperty.call(input, key)', 'safeScalar(input[key])']));
check('explicit sensitive-key denylist exists', all(repo, ['META_SOCIAL_WEBHOOK_SENSITIVE_KEY_DENYLIST', 'access_token', 'authorization', 'email', 'phone', 'signed_url', 'raw_payload']));
check('admin projection exposes digest prefixes not raw payloads', all(repo, ['projectMetaSocialWebhookReceiptForAdmin', 'payloadDigestPrefix', '.slice(0, 16)', 'safeMetadata: sanitizeMetaSocialWebhookMetadata']));
check('metadata and dedupe retention are separate', all(repo, ['retentionUntil', 'dedupeRetainUntil', 'isMetaSocialWebhookMetadataPrunable']));
check('retention classes cover standard failure replay and security review', all(repo, ['STANDARD_WEBHOOK', 'EXTENDED_FAILURE', 'REPLAY_AUDIT', 'SECURITY_REVIEW']));
check('replay eligibility covers source and unknown-outcome blocks', all(repo, ['SOURCE_UNAVAILABLE', 'SOURCE_EXPIRED', 'UNKNOWN_OUTCOME_BLOCKED', 'APPROVAL_REQUIRED', 'ELIGIBLE']));
check('controlled replay requires two-person approval', all(repo, ['META_SOCIAL_WEBHOOK_REPLAY_TWO_PERSON_APPROVAL_REQUIRED', 'actor === approvedBy']));
check('same replay key cannot be rebound to another approval', all(repo, ['META_SOCIAL_WEBHOOK_REPLAY_REQUEST_CONFLICT', 'existing.replayApprovalId !== approvalId']));
check('child receipt remains replay result authority', all(repo, ['replayCompletedAt', 'replayResultCode', "row.replayAttempt > 0 ? 'PROCESSED'"]));
check('digest mismatch is alertable without overwriting canonical digest', all(repo, ['META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH', 'lastDigestMismatchAt', 'lastDigestMismatchCode']) && !repo.includes('"payloadDigest" = EXCLUDED."payloadDigest"'));

check('schema defines retention enums', all(schema, ['enum MetaSocialWebhookRetentionClass', 'STANDARD_WEBHOOK', 'EXTENDED_FAILURE', 'REPLAY_AUDIT']));
check('schema defines replay eligibility and source enums', all(schema, ['enum MetaSocialWebhookReplayEligibility', 'enum MetaSocialWebhookReplaySourceType', 'UNKNOWN_OUTCOME_BLOCKED', 'INSTAGRAM_MESSAGE']));
check('schema stores retention and pruning metadata', all(schema, ['retentionClass', 'retentionUntil', 'dedupeRetainUntil', 'metadataPrunedAt']));
check('schema stores approval and replay result trace', all(schema, ['replayApprovalId', 'replayApprovedBy', 'replayApprovedAt', 'replayApprovalReference', 'replayCompletedAt', 'replayResultCode']));
check('schema links replay approval to existing admin approval model', all(schema, ['MetaSocialWebhookReplayApproval', 'replayApproval          MetaAdminApproval?', 'socialWebhookReplayReceipts']));
check('schema has retention and replay indexes', all(schema, ['MetaSocialWebhookReceipt_retention_idx', 'MetaSocialWebhookReceipt_dedupe_retention_idx', 'MetaSocialWebhookReceipt_replay_eligibility_idx', 'MetaSocialWebhookReceipt_replay_approval_idx']));

check('migration pair and README exist', exists(`${migrationDir}/migration.sql`) && exists(`${migrationDir}/recovery.sql`) && exists(`${migrationDir}/README.md`));
check('migration is additive', all(migration, ['ADD COLUMN "retentionClass"', 'ADD COLUMN "replayEligibility"', 'ADD COLUMN "replayApprovalId"']) && !migration.includes('DROP TABLE'));
check('migration backfill is deterministic and resumable', all(migration, ['Deterministic, resumable backfill', 'WHERE "retentionUntil" IS NULL OR "dedupeRetainUntil" IS NULL', '"receivedAt" + INTERVAL']));
check('migration preserves canonical DB dedupe boundary', !migration.includes('DROP INDEX "MetaSocialWebhookReceipt_dedupe_scope_key"') && !migration.includes('DROP CONSTRAINT "MetaSocialWebhookReceipt_dedupe_scope_key"'));
check('migration includes duplicate and constraint preconditions', all(migration, ['Preconditions before constraints', 'dedupeRetainUntil" < "retentionUntil', 'num_nonnulls', 'MetaAdminApproval']));
check('migration separates metadata and dedupe retention', all(migration, ['INTERVAL \'30 days\'', 'INTERVAL \'365 days\'', 'INTERVAL \'730 days\'']));
check('migration blocks unknown outcomes from replay', all(migration, ['UNKNOWN_OUTCOME_BLOCKED', "~* 'UNKNOWN[_-]?OUTCOME'"]));
check('migration adds approval FK and consistency checks', all(migration, ['MetaSocialWebhookReceipt_replayApprovalId_fkey', 'replay_approval_complete_check', 'replay_source_pair_check', 'replay_result_pair_check']));
check('recovery preserves canonical and business tables', !/DROP TABLE IF EXISTS "(?:MetaSocialWebhookReceipt|MetaLead|MetaMessage|MetaAdminApproval)"/.test(recovery));
check('recovery removes only Layer 3.7 columns enums and indexes', all(recovery, ['DROP COLUMN IF EXISTS "replayApprovalId"', 'DROP COLUMN IF EXISTS "retentionUntil"', 'DROP TYPE IF EXISTS "MetaSocialWebhookRetentionClass"']));
check('recovery contains dependency warning and precondition', all(recovery, ['WARNING', 'approved/executing replay', 'SELECT "id" FROM "MetaSocialWebhookReceipt"']));
check('migration README documents no raw payload storage', all(migrationReadme, ['stores no raw webhook body', 'dedupe retention', 'MetaAdminApproval', 'unknown-write outcomes']));

check('lifecycle SQL verifies persisted admin approval', all(lifecycle, ['JOIN "MetaAdminApproval" approval', "approval.\"status\"='APPROVED'", "approval.\"actionKey\"='META_SOCIAL_WEBHOOK_REPLAY'", 'approval."requestedById"<>approval."approvedById"']));
check('lifecycle SQL fences expired sources and approvals', all(lifecycle, ['replaySourceExpiresAt', 'approval."expiresAt">$11']));
check('lifecycle SQL records replay terminal result on processed and dead-lettered children', all(lifecycle, ['replayCompletedAt', "'PROCESSED'", "'DEAD_LETTERED'"]));
check('lifecycle SQL sets extended retention on dead-letter', all(lifecycle, ["'EXTENDED_FAILURE'::\"MetaSocialWebhookRetentionClass\"", "INTERVAL '180 days'", "INTERVAL '730 days'"]));
check('lead link becomes replay source with retention expiry', all(leadRepo, ["'NORMALIZED_LEAD'::\"MetaSocialWebhookReplaySourceType\"", 'replaySourceExpiresAt', 'SELECT "retentionUntil" FROM "MetaLead"']));
check('Instagram message link becomes replay source', all(instagramRepo, ["'INSTAGRAM_MESSAGE'::\"MetaSocialWebhookReplaySourceType\"", 'replaySourceId', 'APPROVAL_REQUIRED']));

check('focused tests cover exact-body digest behavior', all(testFile, ['exact raw body bytes', 'Buffer.from(body)', "`${body}\\n`"]));
check('focused tests cover token and PII removal', all(testFile, ['accessToken', 'Authorization', 'p@example.com', '+15555550100']));
check('focused tests cover retention and dedupe tombstone', all(testFile, ['retention separates safe metadata deadline', 'metadata pruning is terminal-state']));
check('focused tests cover replay source failures', all(testFile, ['SOURCE_UNAVAILABLE', 'SOURCE_EXPIRED', 'UNKNOWN_OUTCOME_BLOCKED']));
check('focused tests cover two-person approval and idempotency', all(testFile, ['controlled replay requires two-person approval', 'same replay key is idempotent']));
check('focused tests cover admin-safe projection and replay result trace', all(testFile, ['admin projection exposes digest prefixes', 'replay result remains child receipt state authority']));

let failed = 0;
for (const item of checks) {
  const status = item.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${item.label}${item.detail ? `: ${item.detail}` : ''}`);
  if (!item.ok) failed += 1;
}
console.log(`\nPhase 31 Layer 3.7 payload/retention/replay audit: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exit(1);
