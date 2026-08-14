import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
function has(file, pattern, label) {
  const source = read(file);
  const ok = pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
  checks.push({ ok, label, file });
}
function lacks(file, pattern, label) {
  const source = read(file);
  const ok = pattern instanceof RegExp ? !pattern.test(source) : !source.includes(pattern);
  checks.push({ ok, label, file });
}

has('prisma/schema.prisma', 'model MetaAdsInsightSyncRun', 'insights sync run persisted');
has('prisma/schema.prisma', 'model MetaAdsInsightSnapshot', 'normalized insights snapshot persisted');
has('prisma/schema.prisma', 'model MetaAdsRecommendation', 'recommendations persisted');
has('prisma/schema.prisma', 'model MetaAdsMutationExecution', 'mutation execution ledger persisted');
has('prisma/schema.prisma', 'RECONCILIATION_REQUIRED', 'partial provider outcome represented');
has('prisma/migrations/20260718050000_meta_v6_phase13_ads_automation/migration.sql', 'MetaAdsInsightSnapshot', 'forward migration exists');
has('lib/meta/ads/insights.ts', 'metaAdsInsightSnapshot.upsert', 'insight ingestion is idempotent');
has('lib/meta/ads/insights.ts', 'calculated_purchase_value', 'purchase value normalized');
has('lib/meta/ads/safety.ts', 'META_ADS_BUDGET_CAP_EXCEEDED', 'absolute budget cap enforced');
has('lib/meta/ads/safety.ts', 'META_ADS_BUDGET_INCREASE_EXCEEDED', 'relative budget increase cap enforced');
has('lib/meta/ads/safety.ts', 'META_ADS_CREATE_MUST_BE_PAUSED', 'new entities forced paused');
has('lib/meta/ads/safety.ts', 'requiredSuccessfulRuns ?? 3', 'read-only stability gate requires three successes');
has('lib/meta/ads/mutations.ts', 'assertMetaAdsReadOnlyStability', 'write service enforces read-only gate');
has('lib/meta/ads/mutations.ts', 'metaAdsMutationExecution.create', 'write execution reserved before provider call');
has('lib/meta/ads/mutations.ts', "status = 'RECONCILIATION_REQUIRED'", 'provider re-read partial failure handled safely');
has('lib/meta/ads/recommendations.ts', 'generateMetaAdsRecommendationCandidates', 'recommendation engine exists');
has('lib/meta/ads/recommendations.ts', 'PAUSE_ENTITY', 'zero-purchase spend recommendation exists');
has('lib/meta/admin/policy.ts', "META_AD_MUTATION: { risk: 'CRITICAL', requiresApproval: true }", 'all ad mutations require critical approval');
has('app/api/admin/meta/_shared/ads-mutation.ts', 'executeMetaAdminAction', 'ads mutations use immutable audit service');
has('app/api/admin/meta/_shared/ads-mutation.ts', 'approvalId', 'approval ID required');
for (const route of ['campaigns','adsets','creatives','ads']) {
  const file = `app/api/admin/meta/${route}/route.ts`;
  has(file, 'requireAdminPermission', `${route} route permission-scoped`);
  has(file, 'executeApprovedMetaAdsMutation', `${route} route approval-gated`);
  lacks(file, 'withMetaSyncLog', `${route} route no longer has direct legacy write path`);
  lacks(file, 'requireSuperAdmin', `${route} route uses permission separation instead of role-only write`);
}
has('app/api/admin/meta/insights/route.ts', 'listMetaAdsInsights', 'insights GET reads persisted snapshots');
has('app/api/admin/meta/insights/route.ts', 'syncMetaAdsInsights', 'controlled read-only sync endpoint exists');
has('app/api/admin/meta/insights/route.ts', 'safetyCaps', 'dashboard receives server safety caps');
has('app/api/admin/meta/ads/recommendations/route.ts', 'generateMetaAdsRecommendations', 'recommendation generation endpoint exists');
has('lib/jobs/job-types.ts', 'ADS_INSIGHTS_SYNC', 'durable insights job contract exists');
has('lib/jobs/worker.ts', 'META_QUEUE_NAMES.ADS_INSIGHTS', 'insights worker runtime limits exist');
has('lib/jobs/scheduler.ts', 'ads-insights-6h', 'six-hour read-only sync scheduled');
has('workers/meta-ads-insights.worker.ts', 'syncMetaAdsInsights', 'dedicated insights worker exists');
has('app/admin/meta/page.tsx', "{ id: 'ads', label: 'Ads insights' }", 'operations center has Ads tab');
has('app/admin/meta/page.tsx', 'WRITE GATE OPEN', 'UI shows read-only/write gate state');
has('app/admin/meta/page.tsx', 'never auto-applied', 'UI declares recommendation human control');
has('app/admin/meta/page.tsx', "approval.actionKey === 'META_AD_MUTATION'", 'approved ad mutations execute from queue');
has('.env.example', 'META_ADS_MAX_DAILY_BUDGET_BDT', 'daily budget cap documented');
has('.env.example', 'META_ADS_MAX_BUDGET_INCREASE_PERCENT', 'increase cap documented');
has('config/env.manifest.json', 'META_ADS_MAX_LIFETIME_BUDGET_BDT', 'safety cap in environment contract');
has('package.json', 'qa:meta-v6-phase13', 'Phase 13 gate registered');
has('package.json', 'worker:meta-ads-insights', 'Phase 13 worker registered');
has('tests/meta-v6/phase13-ads-automation.test.ts', 'latest failed sync closes the write gate', 'stability failure semantics covered');
has('tests/meta-v6/phase13-ads-automation.test.ts', 'absolute budget cap is enforced', 'budget cap semantics covered');
has('tests/meta-v6/phase13-ads-automation.test.ts', 'approval payload hash is canonical', 'exact payload hash covered');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.label} (${check.file})`);
console.log(`\nPhase 13 static audit: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exit(1);
