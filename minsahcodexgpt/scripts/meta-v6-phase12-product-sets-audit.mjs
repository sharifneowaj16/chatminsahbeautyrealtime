#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const has = (file, ...tokens) => { const source = read(file); return Boolean(source) && tokens.every((token) => source.includes(token)); };
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260718040000_meta_v6_phase12_product_sets/migration.sql');
const service = read('lib/meta/product-sets/service.ts');
const rules = read('lib/meta/product-sets/rules.ts');
const ui = read('app/admin/meta/page.tsx');
const checks = [
  ['P12-01','Product set lifecycle enum',has('prisma/schema.prisma','enum MetaProductSetStatus','DRAFT','READY','SYNCING','ACTIVE','EMPTY','BROKEN','ARCHIVED')],
  ['P12-02','Product set sync enum',has('prisma/schema.prisma','enum MetaProductSetSyncStatus','NOT_SYNCED','SUBMITTED','SUCCEEDED','FAILED')],
  ['P12-03','Product set model',has('prisma/schema.prisma','model MetaProductSet','ruleVersion','ruleJson','ruleHash','membershipHash','memberCount')],
  ['P12-04','Version history model',has('prisma/schema.prisma','model MetaProductSetVersion','version','reason','createdById')],
  ['P12-05','Preview token model',has('prisma/schema.prisma','model MetaProductSetPreview','expiresAt','consumedAt','sampledRetailerIds')],
  ['P12-06','Exact membership model',has('prisma/schema.prisma','model MetaProductSetMembership','retailerId','sourceType','sourceId','@@unique([productSetId, retailerId])')],
  ['P12-07','Catalog scoped slug uniqueness',schema.includes('@@unique([catalogId, slug])')],
  ['P12-08','Provider ID uniqueness',schema.includes('providerProductSetId String?') && schema.includes('@unique')],
  ['P12-09','Empty set incident enum',schema.includes('PRODUCT_SET_EMPTY')],
  ['P12-10','Broken set incident enum',schema.includes('PRODUCT_SET_BROKEN')],
  ['P12-11','Forward migration creates set',migration.includes('CREATE TABLE IF NOT EXISTS "MetaProductSet"')],
  ['P12-12','Forward migration creates versions',migration.includes('CREATE TABLE IF NOT EXISTS "MetaProductSetVersion"')],
  ['P12-13','Forward migration creates previews',migration.includes('CREATE TABLE IF NOT EXISTS "MetaProductSetPreview"')],
  ['P12-14','Forward migration creates membership',migration.includes('CREATE TABLE IF NOT EXISTS "MetaProductSetMembership"')],
  ['P12-15','Rule field allowlist',has('lib/meta/product-sets/types.ts','PRODUCT_SET_RULE_FIELDS','BRAND','PRODUCT_TYPE','CUSTOM_LABEL_2','HAS_SALE')],
  ['P12-16','Rule operator allowlist',has('lib/meta/product-sets/types.ts','PRODUCT_SET_RULE_OPERATORS','EQUALS','IN','GTE','CONTAINS')],
  ['P12-17','Bounded condition count',rules.includes('MAX_CONDITIONS = 12')],
  ['P12-18','Canonical rule sort',rules.includes('.sort((left, right) =>')],
  ['P12-19','Stable SHA-256 hash',rules.includes("createHash('sha256')")],
  ['P12-20','Deterministic membership sort',rules.includes("left.retailerId.localeCompare(right.retailerId)")],
  ['P12-21','Explicit retailer filter',has('lib/meta/product-sets/rules.ts','compileMetaProductSetFilter','retailer_id','is_any')],
  ['P12-22','Empty provider sync blocked',rules.includes('PRODUCT_SET_EMPTY_SYNC_BLOCKED')],
  ['P12-23','Canonical catalog source reused',has('lib/meta-platform/domains/catalog/orchestration.ts','listCanonicalCatalogItemsForProductSets','buildCanonicalCatalogPlan') && has('lib/meta/product-sets/service.ts','listCanonicalCatalogItemsForProductSets')],
  ['P12-24','Official SDK provider create',has('lib/meta-platform/transports/business-sdk/adapters/catalog.ts','ProductCatalog','createMetaCatalogProductSet','createProductSet') && has('lib/meta/product-sets/provider.ts','upsertProviderProductSetThroughMetaPlatform')],
  ['P12-25','Official SDK provider update',has('lib/meta-platform/transports/business-sdk/adapters/catalog.ts','ProductSet','updateMetaCatalogProductSet','update') && has('lib/meta/product-sets/provider.ts','upsertProviderProductSetThroughMetaPlatform')],
  ['P12-26','Versioned create',has('lib/meta/product-sets/service.ts','createMetaProductSet','metaProductSetVersion.create')],
  ['P12-27','Optimistic update lock',service.includes('ruleVersion: current.ruleVersion') && service.includes('PRODUCT_SET_VERSION_CONFLICT')],
  ['P12-28','Preview TTL',service.includes('PREVIEW_TTL_MS = 30 * 60_000')],
  ['P12-29','Membership replacement',has('lib/meta/product-sets/service.ts','metaProductSetMembership.deleteMany','metaProductSetMembership.createMany')],
  ['P12-30','Preview stores membership hash',service.includes('membershipHash: preview.membershipHash')],
  ['P12-31','Stale preview guard',service.includes('PRODUCT_SET_PREVIEW_STALE')],
  ['P12-32','Consumed preview guard',service.includes('PRODUCT_SET_PREVIEW_ALREADY_CONSUMED')],
  ['P12-33','Expired preview guard',service.includes('PRODUCT_SET_PREVIEW_EXPIRED')],
  ['P12-34','Provider mutation after guards',service.indexOf('PRODUCT_SET_PREVIEW_STALE') < service.indexOf('const provider = await upsertProviderProductSet')],
  ['P12-35','Rollback is monotonic version',service.includes('Rollback to version') && service.includes('const nextVersion = set.ruleVersion + 1')],
  ['P12-36','Empty set alert',service.includes("incidentType: 'PRODUCT_SET_EMPTY'")],
  ['P12-37','Broken set alert',service.includes("incidentType: 'PRODUCT_SET_BROKEN'")],
  ['P12-38','Auto-sync still previews first',service.indexOf('previewMetaProductSet') < service.indexOf('syncMetaProductSetFromPreview')],
  ['P12-39','Dedicated reconcile queue',has('lib/jobs/job-types.ts','PRODUCT_SETS','PRODUCT_SET_RECONCILE','product_set_reconcile')],
  ['P12-40','Six-hour schedule',has('lib/jobs/scheduler.ts','product-sets-6h','buildProductSetReconcileIdempotencyKey')],
  ['P12-41','Dedicated worker',has('workers/meta-product-sets.worker.ts','startMetaProductSetsWorker','reconcileMetaProductSets')],
  ['P12-42','Product set metrics',has('lib/observability/metrics.ts','meta_product_set_rule_mutations_total','meta_product_set_sync_total','meta_product_set_members_total')],
  ['P12-43','Admin CRUD route permission and audit',has('app/api/admin/meta/product-sets/route.ts','META_OPS_VIEW','META_OPS_OPERATE','executeMetaAdminAction')],
  ['P12-44','Approval-gated sync policy',has('lib/meta/admin/policy.ts','META_PRODUCT_SET_SYNC','requiresApproval: true')],
  ['P12-45','Exact sync approval payload',has('app/api/admin/meta/product-sets/[productSetId]/sync/route.ts','payload: { productSetId, previewId }','approvalId')],
  ['P12-46','Rollback endpoint audited',has('app/api/admin/meta/product-sets/[productSetId]/rollback/route.ts','META_PRODUCT_SET_ROLLBACK','executeMetaAdminAction')],
  ['P12-47','Rule builder UI',ui.includes('Deterministic product set rule builder')],
  ['P12-48','Preview UI',ui.includes('Product set membership preview generated.')],
  ['P12-49','Approval sync UI',ui.includes('Request sync approval') && ui.includes('META_PRODUCT_SET_SYNC')],
  ['P12-50','Rollback UI',ui.includes('Rollback to v')],
  ['P12-51','Phase 12 semantic suite',has('tests/meta-v6/phase12-product-sets.test.ts','deterministic evaluator sorts membership','fresh preview parity','scheduled reconciliation')],
];
const failures = checks.filter(([, , ok]) => !ok);
for (const [id, label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${label}`);
console.log(`\nPhase 12 static audit: ${checks.length - failures.length}/${checks.length} passed`);
if (failures.length) process.exit(1);
