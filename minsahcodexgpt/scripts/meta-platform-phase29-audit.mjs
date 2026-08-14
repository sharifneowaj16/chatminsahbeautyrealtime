#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const exists = (file) => fs.existsSync(file);
const includesAll = (source, values) => values.every((value) => source.includes(value));

const required = [
  'lib/meta-platform/domains/ads/service.ts',
  'lib/meta-platform/domains/insights/service.ts',
  'lib/meta-platform/domains/audiences/service.ts',
  'lib/meta-platform/migration/phase29-cutover.ts',
  'lib/meta-platform/migration/phase29-read.ts',
  'lib/meta-platform/migration/phase29-ads-facade.ts',
  'lib/meta-platform/migration/phase29-audiences-facade.ts',
  'lib/meta/audiences/mutations.ts',
  'app/api/admin/meta/_shared/audience-mutation.ts',
  'tests/meta-v6/phase29-ads-audiences-migration.test.ts',
  'docs/architecture/meta/ADR-029-ads-audiences-cutover.md',
  'docs/runbooks/meta-phase29-ads-audiences-cutover.md',
  'docs/release/meta-v6/phase-29-evidence.md',
];
check('all Phase 29 implementation, test, ADR, runbook and evidence files exist', required.every(exists), required.filter((file) => !exists(file)).join(', '));

const marketing = read('lib/meta-business/marketing.ts');
const audiences = read('lib/meta-business/audiences.ts');
check('legacy Ads wrapper delegates only to Phase 29 MetaPlatform facade', marketing.includes('phase29-ads-facade') && !/facebook-nodejs-business-sdk|\bmetaSdk\b|getMetaApi|requireMetaConfig\(['"]accessToken/.test(marketing));
check('legacy Audience wrapper delegates only to Phase 29 MetaPlatform facade', audiences.includes('phase29-audiences-facade') && !/facebook-nodejs-business-sdk|\bmetaSdk\b|getMetaApi|requireMetaConfig\(['"]accessToken/.test(audiences));

const adsAdapter = read('lib/meta-platform/transports/business-sdk/adapters/ads.ts');
const insightsAdapter = read('lib/meta-platform/transports/business-sdk/adapters/insights.ts');
const audienceAdapter = read('lib/meta-platform/transports/business-sdk/adapters/audiences.ts');
check('Business SDK transport owns campaigns, ad sets, creatives and ads operations', includesAll(adsAdapter, ['getMetaAdAccount', 'listMetaAdAccountEntities', 'createMetaAdAccountEntity', 'updateMetaAdsEntity']));
check('Business SDK transport owns sync and async insights operations', includesAll(insightsAdapter, ['getMetaAdAccountInsights', 'createMetaAdAccountAsyncInsightsReport', 'getMetaAsyncInsightsReportStatus', 'getMetaAsyncInsightsReportResults']));
check('Business SDK transport owns audience state and hashed member operations', includesAll(audienceAdapter, ['listMetaCustomAudiences', 'getMetaCustomAudience', 'createMetaCustomAudience', 'mutateMetaCustomAudienceUsers']));

const cutover = read('lib/meta-platform/migration/phase29-cutover.ts');
check('read cutover supports legacy, shadow, platform and explicit legacy disable', includesAll(cutover, ['LEGACY', 'SHADOW', 'PLATFORM', '_READS', '_SHADOW', '_LEGACY_DISABLED']));
check('write cutover supports test asset, global enable, kill switch and fail-closed block', includesAll(cutover, ['PLATFORM_TEST', '_TEST_ASSET_ID', '_WRITES', '_KILL_SWITCH', 'BLOCKED']));
const readBoundary = read('lib/meta-platform/migration/phase29-read.ts');
check('read boundary compares canonical shadow results and uses bounded stale fallback', includesAll(readBoundary, ['compareMetaAdsCanonical', 'executeMetaReadWithStaleFallback', 'shadowDifferences', 'stale: loaded.stale']));

const adsSafety = read('lib/meta/ads/safety.ts');
check('inherited Ads writes remain exact allowlisted, budget-capped and PAUSED-on-create', includesAll(adsSafety, ['ALLOWED_FIELDS', 'META_ADS_BUDGET_CAP_EXCEEDED', 'META_ADS_CREATE_MUST_BE_PAUSED', 'buildMetaAdminPayloadHash']));
const adsMutations = read('lib/meta/ads/mutations.ts');
check('Ads writes retain before/after state and reconciliation ledger', includesAll(adsMutations, ['beforeData', 'afterData', 'RECONCILIATION_REQUIRED', 'approvalId']));

const audienceHashing = read('lib/meta-platform/domains/audiences/hashing.ts');
const audienceSafety = read('lib/meta/audiences/safety.ts');
check('audience inputs require explicit consent and a strong identifier before deterministic SHA-256 normalization', includesAll(audienceHashing, ['hasExplicitMetaAudienceConsent', 'sha256', 'requireExplicitConsent', '!email && !phone && !externalId', 'META_AUDIENCE_CONSENT_REQUIRED_FOR_EVERY_CUSTOMER']));
check('canonical audience approvals forbid raw PII, validate full hashed rows and lock an exact batch digest', includesAll(audienceSafety, ['META_AUDIENCE_RAW_PII_FORBIDDEN', 'META_AUDIENCE_HASH_INVALID', 'buildMetaAudienceHashedBatchDigest', 'batchDigest', 'META_AUDIENCE_BATCH_DIGEST_MISMATCH', 'buildMetaAdminPayloadHash']));
check('approval hashes use full sanitized payloads without display truncation', includesAll(read('lib/meta/admin/policy.ts'), ['redactMetaAdminDataForHash', 'canonicalize']) && includesAll(read('lib/meta/admin/redaction.ts'), ['walkForHash', 'META_ADMIN_HASH_PAYLOAD_CYCLIC', 'value.map']));
const audienceShared = read('app/api/admin/meta/_shared/audience-mutation.ts');
check('audience flow supports request, independent approval and exact execution', includesAll(audienceShared, ['requestApproval', 'createMetaAdminApproval', "actionKey: 'META_AUDIENCE_MUTATION'", 'executeMetaAudienceMutation']));
const policy = read('lib/meta/admin/policy.ts');
check('audience mutations are CRITICAL two-person actions', /META_AUDIENCE_MUTATION:\s*\{\s*risk:\s*'CRITICAL',\s*requiresApproval:\s*true/.test(policy));

for (const file of ['app/api/admin/meta/audiences/route.ts','app/api/admin/meta/audiences/lookalike/route.ts','app/api/admin/meta/audiences/retargeting/route.ts','app/api/admin/meta/audiences/sync/route.ts']) {
  const source = read(file);
  check(`${file} is approval governed`, source.includes('executeOrRequestApprovedMetaAudienceMutation'));
  check(`${file} does not persist raw request body`, !/requestData:\s*body|withMetaSyncLog/.test(source));
}

const insights = read('lib/meta/ads/insights.ts');
check('stale insight fallback cannot be recorded as a successful provider sync', insights.includes('META_ADS_INSIGHTS_STALE_FALLBACK_NOT_SYNCABLE'));
const env = read('.env.example');
check('environment sample documents Ads and Audience cutover/rollback flags', includesAll(env, ['META_PLATFORM_ADS_SHADOW', 'META_PLATFORM_ADS_READS', 'META_PLATFORM_ADS_WRITES', 'META_PLATFORM_ADS_KILL_SWITCH', 'META_PLATFORM_AUDIENCES_SHADOW', 'META_PLATFORM_AUDIENCES_WRITES', 'META_PLATFORM_AUDIENCES_KILL_SWITCH']));
const pkg = JSON.parse(read('package.json'));
check('Phase 29 has distinct tests/audit/gate without overwriting search qa:phase29', pkg.scripts['qa:phase29'] === 'node scripts/master-search-regression-audit.mjs' && Boolean(pkg.scripts['test:meta-v6-phase29']) && Boolean(pkg.scripts['qa:meta-platform-phase29']) && Boolean(pkg.scripts['qa:meta-v6-phase29']));
check('cumulative MetaPlatform and predeploy gates include Phase 29', String(pkg.scripts['qa:meta-platform-phases19-29']).includes('qa:meta-v6-phase29') && String(pkg.scripts['qa:predeploy']).includes('qa:meta-v6-phase29'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 29 Ads/Audiences migration audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
