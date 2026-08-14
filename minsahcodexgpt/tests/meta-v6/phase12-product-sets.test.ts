import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { CanonicalCatalogItem } from '@/lib/meta/catalog/domain/types';
import {
  compileMetaProductSetFilter,
  evaluateProductSetRule,
  normalizeProductSetRule,
  productSetStableHash,
} from '@/lib/meta/product-sets/rules';
import { META_JOB_NAMES, META_QUEUE_NAMES, validateMetaJobPayload } from '@/lib/jobs/job-types';

function item(input: Partial<CanonicalCatalogItem> & Pick<CanonicalCatalogItem, 'retailerId'>): CanonicalCatalogItem {
  const { retailerId, ...overrides } = input;
  return {
    sourceType: 'PRODUCT', sourceId: retailerId, retailerId,
    title: retailerId, description: 'x', availability: 'in stock', quantityToSellOnFacebook: 10,
    condition: 'new', price: { amount: 100, currency: 'BDT' }, link: 'https://example.com/p', imageLink: 'https://example.com/i.jpg',
    brand: 'Minsah', visibility: 'published', customLabels: { custom_label_2: 'Skincare', custom_label_3: 'regular' },
    ...overrides,
  };
}

const catalog = [
  item({ retailerId: 'sku-c', brand: 'Other', price: { amount: 900, currency: 'BDT' }, customLabels: { custom_label_2: 'Makeup', custom_label_3: 'regular' } }),
  item({ retailerId: 'sku-a', brand: 'Minsah', price: { amount: 500, currency: 'BDT' }, sale: { price: { amount: 450, currency: 'BDT' }, effectiveDate: '2026-07-01T00:00:00Z/2026-08-01T00:00:00Z' } }),
  item({ retailerId: 'sku-b', brand: 'Minsah', price: { amount: 700, currency: 'BDT' } }),
];

test('deterministic evaluator sorts membership and produces stable hashes', () => {
  const rule = { combinator: 'AND', conditions: [{ field: 'BRAND', operator: 'EQUALS', value: 'minsah' }] };
  const first = evaluateProductSetRule(catalog, rule);
  const second = evaluateProductSetRule([...catalog].reverse(), rule);
  assert.deepEqual(first.members.map((entry) => entry.retailerId), ['sku-a', 'sku-b']);
  assert.equal(first.membershipHash, second.membershipHash);
  assert.equal(first.ruleHash, second.ruleHash);
});

test('condition order cannot change canonical rule hash', () => {
  const left = normalizeProductSetRule({ combinator: 'AND', conditions: [
    { field: 'PRICE', operator: 'GTE', value: 400 },
    { field: 'BRAND', operator: 'EQUALS', value: 'Minsah' },
  ] });
  const right = normalizeProductSetRule({ combinator: 'and', conditions: [
    { field: 'brand', operator: 'equals', value: 'Minsah' },
    { field: 'price', operator: 'gte', value: '400' },
  ] });
  assert.equal(productSetStableHash(left), productSetStableHash(right));
});

test('AND and OR rules evaluate merchandising segments correctly', () => {
  const and = evaluateProductSetRule(catalog, { combinator: 'AND', conditions: [
    { field: 'BRAND', operator: 'EQUALS', value: 'Minsah' },
    { field: 'PRICE', operator: 'LTE', value: 600 },
  ] });
  const or = evaluateProductSetRule(catalog, { combinator: 'OR', conditions: [
    { field: 'CUSTOM_LABEL_2', operator: 'EQUALS', value: 'Makeup' },
    { field: 'HAS_SALE', operator: 'EQUALS', value: true },
  ] });
  assert.deepEqual(and.sampledRetailerIds, ['sku-a']);
  assert.deepEqual(or.sampledRetailerIds, ['sku-a', 'sku-c']);
});

test('IN values are bounded, normalized and deduplicated', () => {
  const rule = normalizeProductSetRule({ combinator: 'AND', conditions: [{ field: 'SOURCE_TYPE', operator: 'IN', value: ['PRODUCT', 'product', 'VARIANT'] }] });
  assert.deepEqual(rule.conditions[0].value, ['PRODUCT', 'VARIANT']);
});

test('invalid fields and invalid numeric operators fail closed', () => {
  assert.throws(() => normalizeProductSetRule({ combinator: 'AND', conditions: [{ field: 'EMAIL', operator: 'EQUALS', value: 'x' }] }), /FIELD_UNSUPPORTED/);
  assert.throws(() => normalizeProductSetRule({ combinator: 'AND', conditions: [{ field: 'BRAND', operator: 'GTE', value: 1 }] }), /NUMERIC_OPERATOR_INVALID/);
  assert.throws(() => normalizeProductSetRule({ combinator: 'AND', conditions: [] }), /CONDITION_COUNT_INVALID/);
});

test('Meta filter compiles exact sorted retailer membership and blocks empty sync', () => {
  assert.deepEqual(compileMetaProductSetFilter(['sku-b', 'sku-a', 'sku-b']), { retailer_id: { is_any: ['sku-a', 'sku-b'] } });
  assert.throws(() => compileMetaProductSetFilter([]), /EMPTY_SYNC_BLOCKED/);
});

test('product set reconciliation job has a dedicated queue contract', () => {
  const payload = { schemaVersion: 1 as const, idempotencyKey: 'product-set-reconcile:2026-07-18T00:00:00.000Z', requestedAt: '2026-07-18T00:00:00.000Z', type: 'product_set_reconcile' as const };
  const result = validateMetaJobPayload({ queueName: META_QUEUE_NAMES.PRODUCT_SETS, jobName: META_JOB_NAMES.PRODUCT_SET_RECONCILE, payload });
  assert.equal(result.valid, true);
  assert.equal(validateMetaJobPayload({ queueName: META_QUEUE_NAMES.DIAGNOSTICS, jobName: META_JOB_NAMES.PRODUCT_SET_RECONCILE, payload }).valid, false);
});

test('schema and migration persist versioned product sets, previews and exact membership', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260718040000_meta_v6_phase12_product_sets/migration.sql', 'utf8');
  for (const token of ['model MetaProductSet', 'model MetaProductSetVersion', 'model MetaProductSetPreview', 'model MetaProductSetMembership', 'enum MetaProductSetStatus', 'enum MetaProductSetSyncStatus']) assert.match(schema, new RegExp(token));
  assert.match(schema, /@@unique\(\[productSetId, retailerId\]\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "MetaProductSet"/);
  assert.match(migration, /PRODUCT_SET_EMPTY/);
  assert.match(migration, /PRODUCT_SET_BROKEN/);
});

test('preview service writes exact membership hash and an expiring preview token', () => {
  const source = fs.readFileSync('lib/meta/product-sets/service.ts', 'utf8');
  assert.match(source, /PREVIEW_TTL_MS/);
  assert.match(source, /metaProductSetMembership\.deleteMany/);
  assert.match(source, /metaProductSetMembership\.createMany/);
  assert.match(source, /membershipHash: preview\.membershipHash/);
  assert.match(source, /sampledRetailerIds/);
});

test('sync service enforces fresh preview parity before provider mutation', () => {
  const source = fs.readFileSync('lib/meta/product-sets/service.ts', 'utf8');
  assert.match(source, /PRODUCT_SET_PREVIEW_EXPIRED/);
  assert.match(source, /preview\.ruleVersion !== set\.ruleVersion/);
  assert.match(source, /preview\.membershipHash !== set\.membershipHash/);
  assert.match(source, /preview\.memberCount !== memberships\.length/);
  assert.match(source, /PRODUCT_SET_EMPTY_SYNC_BLOCKED/);
});

test('provider integration uses official ProductCatalog and ProductSet SDK objects', () => {
  const source = fs.readFileSync('lib/meta/product-sets/provider.ts', 'utf8');
  assert.match(source, /new metaSdk\.ProductCatalog/);
  assert.match(source, /createProductSet/);
  assert.match(source, /new metaSdk\.ProductSet/);
  assert.match(source, /compileMetaProductSetFilter/);
});

test('admin mutations are permission-scoped, audited and sync requires exact approval payload', () => {
  const route = fs.readFileSync('app/api/admin/meta/product-sets/route.ts', 'utf8');
  const preview = fs.readFileSync('app/api/admin/meta/product-sets/[productSetId]/preview/route.ts', 'utf8');
  const sync = fs.readFileSync('app/api/admin/meta/product-sets/[productSetId]/sync/route.ts', 'utf8');
  const rollback = fs.readFileSync('app/api/admin/meta/product-sets/[productSetId]/rollback/route.ts', 'utf8');
  for (const source of [route, preview, sync, rollback]) assert.match(source, /requireAdminPermission/);
  for (const source of [route, preview, sync, rollback]) assert.match(source, /executeMetaAdminAction/);
  assert.match(sync, /META_PRODUCT_SET_SYNC/);
  assert.match(sync, /approvalId/);
  assert.match(sync, /payload: \{ productSetId, previewId \}/);
});

test('scheduled reconciliation and incidents detect empty and broken sets', () => {
  const scheduler = fs.readFileSync('lib/jobs/scheduler.ts', 'utf8');
  const worker = fs.readFileSync('workers/meta-product-sets.worker.ts', 'utf8');
  const service = fs.readFileSync('lib/meta/product-sets/service.ts', 'utf8');
  assert.match(scheduler, /product-sets-6h/);
  assert.match(worker, /reconcileMetaProductSets/);
  assert.match(service, /PRODUCT_SET_EMPTY/);
  assert.match(service, /PRODUCT_SET_BROKEN/);
  assert.match(service, /autoSync && preview\.memberCount > 0/);
});

test('Operations Center exposes rule builder, preview, approval sync and rollback', () => {
  const page = fs.readFileSync('app/admin/meta/page.tsx', 'utf8');
  for (const token of ['Product sets', 'Deterministic product set rule builder', 'Request sync approval', 'Rollback to v', 'Generate a fresh product set preview']) assert.match(page, new RegExp(token));
  assert.match(page, /META_PRODUCT_SET_SYNC/);
  assert.match(page, /api\/admin\/meta\/product-sets/);
});
