#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const includesAll = (source, values) => values.every((value) => source.includes(value));

const required = [
  'lib/meta-platform/domains/catalog/service.ts',
  'lib/meta-platform/domains/catalog/orchestration.ts',
  'lib/meta-platform/domains/catalog/normalization.ts',
  'lib/meta-platform/domains/catalog/types.ts',
  'lib/meta-platform/migration/phase30-cutover.ts',
  'lib/meta-platform/migration/phase30-read.ts',
  'lib/meta-platform/migration/phase30-catalog-facade.ts',
  'app/api/admin/meta/catalogs/delete-plan/route.ts',
  'prisma/migrations/20260723163000_meta_v6_phase30_catalog_commerce/migration.sql',
  'tests/meta-v6/phase30-catalog-commerce-migration.test.mjs',
  'docs/architecture/meta/ADR-030-catalog-commerce-cutover.md',
  'docs/runbooks/meta-phase30-catalog-commerce-cutover.md',
  'docs/release/meta-v6/phase-30-evidence.md',
];
check('all Phase 30 implementation, migration, test and evidence files exist', required.every(exists), required.filter((file) => !exists(file)).join(', '));

const legacyCatalog = read('lib/meta-business/catalog.ts');
const productSets = read('lib/meta/product-sets/provider.ts');
const diagnostics = read('lib/meta/catalog/diagnostics.ts');
for (const [label, source] of [['catalog compatibility wrapper', legacyCatalog], ['product-set provider', productSets], ['catalog diagnostics', diagnostics]]) {
  check(`${label} delegates without direct SDK/token/Graph client access`, !/facebook-nodejs-business-sdk|\bmetaSdk\b|createMetaGraphClient|requireMetaConfig\(['"]accessToken/.test(source));
}
check('catalog wrapper delegates to Phase 30 facade/orchestration', includesAll(legacyCatalog, ['phase30-catalog-facade', 'domains/catalog/orchestration']));
check('diagnostics delegates through Phase 30 read boundary', diagnostics.includes('fetchCatalogDiagnosticsThroughMetaPlatform'));

const adapter = read('lib/meta-platform/transports/business-sdk/adapters/catalog.ts');
check('unified Business SDK adapter owns catalogs, items, feeds and product sets', includesAll(adapter, [
  'listMetaOwnedCatalogs', 'createMetaOwnedCatalog', 'updateMetaCatalog', 'listMetaCatalogProducts',
  'submitMetaCatalogItemsBatch', 'createMetaProductFeed', 'uploadMetaProductFeed', 'scheduleMetaProductFeed',
  'listMetaCatalogProductSets', 'createMetaCatalogProductSet', 'updateMetaCatalogProductSet',
]));
const service = read('lib/meta-platform/domains/catalog/service.ts');
check('catalog service centralizes Business SDK/Graph transport and 30s provider deadlines', includesAll(service, ['MetaBusinessSdkClientFactory', 'MetaGraphHttpClient', "capability: 'catalog-commerce'", 'BUSINESS_SYSTEM_USER', 'timeoutMs: 30_000']));
check('catalog service handles bounded diagnostics pagination and cursor loops', includesAll(service, ['pages < 10', 'seenCursors', 'META_GRAPH_PAGINATION_CURSOR_LOOP']));

const cutover = read('lib/meta-platform/migration/phase30-cutover.ts');
check('read cutover supports legacy, shadow, platform and explicit legacy disable', includesAll(cutover, ['LEGACY', 'SHADOW', 'PLATFORM', 'META_PLATFORM_CATALOG_READS', 'META_PLATFORM_CATALOG_SHADOW', 'META_PLATFORM_CATALOG_LEGACY_DISABLED']));
check('write cutover supports test catalog, global enable, kill switches and fail-closed block', includesAll(cutover, ['PLATFORM_TEST', 'META_PLATFORM_CATALOG_TEST_CATALOG_ID', 'META_PLATFORM_CATALOG_WRITES', 'META_PLATFORM_CATALOG_KILL_SWITCH', 'META_PLATFORM_GLOBAL_KILL_SWITCH', 'BLOCKED']));
check('mass delete has an independent emergency override', cutover.includes('META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE'));
const readBoundary = read('lib/meta-platform/migration/phase30-read.ts');
check('read boundary performs mode-aware shadow comparison and bounded stale fallback', includesAll(readBoundary, ['stableCatalogHash', 'shadowMatched', 'loaded.stale', 'acceptFresh']));

const orchestration = read('lib/meta-platform/domains/catalog/orchestration.ts');
check('canonical SKU identity is fail-closed', includesAll(orchestration, ["source !== 'sku'", 'META_PHASE30_CANONICAL_SKU_REQUIRED', 'META_CATALOG_SKU_IDENTITY_UNRESOLVED']));
check('canonical mapper, semantic validation and payload fingerprint remain the write source', includesAll(orchestration, ['mapProductToCatalogItems', 'mapped.validation.errors', 'catalogPayloadHash', 'serializeItemsBatchUpdate']));
check('normal sync never submits deletion requests', includesAll(orchestration, ['submittedDeletes: 0', "deletionMode: 'DRY_RUN_APPROVAL_REQUIRED'"]) && !/syncCatalogProducts[\s\S]{0,5000}serializeItemsBatchDelete/.test(orchestration));
check('delete plan includes full sorted IDs, source snapshot and exact digest', includesAll(orchestration, ['buildCatalogDeleteDryRun', 'sourceSnapshotHash', 'buildCatalogDeletePlanPayload', 'digest']));
check('delete execution revalidates live plan and exact digest before claim', includesAll(orchestration, ['assertCatalogDeletePlanIntegrity', 'current.digest !== payload.digest', 'META_CATALOG_DELETE_PLAN_STALE', "status: 'EXECUTING'"]));
check('mass delete override is checked at execution, not preview only', orchestration.includes('assertMetaPhase30MassDeleteOverride({ required: payload.requiresEmergencyOverride })'));
check('item-level outcomes are reconciled by retailer ID or provider index', includesAll(orchestration, ['outcomeByRetailer', 'outcomeByIndex', 'providerIndex']));
check('only known retryable UPDATE failures receive bounded retries', includesAll(orchestration, ["outcome?.retryable && item.method === 'UPDATE'", 'maxItemRetryAttempts', "operationKind: 'RETRY'"]));
check('DELETE failures are never auto-retried', !/retryable[\s\S]{0,160}method === 'DELETE'/.test(orchestration));
check('invalid current items remain desired and cannot be accidentally deleted', orchestration.includes('...plan.invalidItems.map((entry) => entry.retailerId)'));

const deleteRoute = read('app/api/admin/meta/catalogs/delete-plan/route.ts');
check('delete route enforces preview, independent approval and exact approved execution', includesAll(deleteRoute, ["action === 'preview'", "action === 'request_approval'", "action === 'execute'", 'createMetaAdminApproval', "actionKey: 'META_CATALOG_DELETE'", 'approvalId']));
check('delete queue payload contains only plan identity, not retailer IDs', deleteRoute.includes("mode: 'delete'") && !/enqueueMetaCatalogSyncJob\([\s\S]{0,400}retailerIds/.test(deleteRoute));
const policy = read('lib/meta/admin/policy.ts');
check('catalog deletion remains CRITICAL and independently approved', /META_CATALOG_DELETE:\s*\{\s*risk:\s*'CRITICAL',\s*requiresApproval:\s*true/.test(policy));

const feedRoute = read('app/api/admin/meta/catalogs/feed/route.ts');
check('feed audit metadata never persists signed/tokenized URL values', feedRoute.includes('urlConfigured') && !/payload:\s*body|requestData:\s*body/.test(feedRoute));
const workers = read('workers/meta-catalog.worker.ts') + read('workers/meta-batch-status.worker.ts');
check('catalog and batch workers import unified orchestration directly', workers.includes('meta-platform/domains/catalog/orchestration') && !workers.includes("from '@/lib/meta-business/catalog'"));
check('delete worker executes only an approved queued plan ID', includesAll(workers, ["data.mode === 'delete'", 'executeCatalogDeletePlan', 'data.deletePlanId!']));

const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260723163000_meta_v6_phase30_catalog_commerce/migration.sql');
check('schema persists immutable delete plans and item-level retry lineage', includesAll(schema, ['model MetaCatalogDeletePlan', 'MetaCatalogDeletePlanStatus', 'providerIndex', 'attempt', 'retryOfBatchItemId', 'deletePlanId']));
check('migration enforces count/digest/ratio/expiry constraints and immutable request trigger', includesAll(migration, ['cardinality("retailerIds")', 'length("digest") = 64', 'MetaCatalogDeletePlan_ratio', 'MetaCatalogDeletePlan_expiry', 'meta_catalog_delete_plan_protect_request']));

const env = read('.env.example');
check('environment sample documents Phase 30 cutover, retry and deletion guards', includesAll(env, ['META_PLATFORM_CATALOG_SHADOW', 'META_PLATFORM_CATALOG_READS', 'META_PLATFORM_CATALOG_WRITES', 'META_PLATFORM_CATALOG_KILL_SWITCH', 'META_PLATFORM_CATALOG_ITEM_RETRY_MAX_ATTEMPTS', 'META_PLATFORM_CATALOG_DELETE_MAX_COUNT', 'META_PLATFORM_CATALOG_DELETE_MAX_RATIO', 'META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE']));
check('canonical SKU environment contract is documented', includesAll(env, ['META_CATALOG_ID_SOURCE=sku', 'NEXT_PUBLIC_META_CATALOG_ID_SOURCE=sku']));

const phase2Audit = read('scripts/meta-v6-phase2-catalog-audit.mjs');
check('inherited catalog audit retains sale, availability/backorder and variant validation', /sale|Sale/.test(phase2Audit) && /backorder|availability|stock/i.test(phase2Audit) && /variant/i.test(phase2Audit));
const pkg = JSON.parse(read('package.json'));
check('Phase 30 has distinct MetaPlatform gates without overwriting search qa:phase30', pkg.scripts['qa:phase30'] === 'node scripts/search-production-verification-audit.mjs' && Boolean(pkg.scripts['test:meta-v6-phase30']) && Boolean(pkg.scripts['qa:meta-platform-phase30']) && Boolean(pkg.scripts['qa:meta-v6-phase30']));
check('cumulative MetaPlatform and predeploy gates include Phase 30', String(pkg.scripts['qa:meta-platform-phases19-30']).includes('qa:meta-v6-phase30') && String(pkg.scripts['qa:predeploy']).includes('qa:meta-v6-phase30'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 30 catalog/commerce migration audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
