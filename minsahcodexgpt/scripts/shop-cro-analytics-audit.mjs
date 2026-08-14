#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const issues = [];

function file(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(file(relativePath));
}

function read(relativePath) {
  const absolute = file(relativePath);
  if (!fs.existsSync(absolute)) {
    issues.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function expect(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

const schema = read('prisma/schema.prisma');
expect('ShopTrackingEvent model exists', schema.includes('model ShopTrackingEvent'));
expect('ShopTrackingEvent stores item payload and filters as JSON', includesAll(schema, [
  'items         Json?',
  'filters       Json?',
  'metadata      Json?',
]));
expect('ShopTrackingEvent has event/list/filter indexes', includesAll(schema, [
  '@@index([eventName])',
  '@@index([eventId])',
  '@@index([listName])',
  '@@index([sortValue])',
  '@@index([filterName])',
  '@@index([intentOnly])',
]));

const migration = read('prisma/migrations/20260707152000_phase8_shop_cro_tracking_events/migration.sql');
expect('Phase 8 migration creates ShopTrackingEvent idempotently', includesAll(migration, [
  'CREATE TABLE IF NOT EXISTS "ShopTrackingEvent"',
  '"items" JSONB',
  '"filters" JSONB',
  '"intentOnly" BOOLEAN NOT NULL DEFAULT false',
  'CREATE UNIQUE INDEX IF NOT EXISTS "ShopTrackingEvent_eventId_key"',
]));

const shopCro = read('lib/tracking/shop-cro-events.ts');
expect('server shop CRO helper exists with schema version and allowed events', includesAll(shopCro, [
  'SHOP_CRO_SCHEMA_VERSION',
  'SHOP_CRO_EVENT_NAMES',
  "'view_item_list'",
  "'select_item'",
  "'filter_apply'",
  "'sort_apply'",
  "'add_to_cart'",
  "'buy_now_click'",
  "'clear_filter'",
  "'page_change'",
]));
expect('server shop CRO sanitizer limits items and removes raw PII assumptions', includesAll(shopCro, [
  'MAX_ITEMS = 20',
  'sanitizeItems',
  'cleanRecord',
  'sanitizeShopCroEvent',
]));
expect('server shop CRO persistence writes ShopTrackingEvent', includesAll(shopCro, [
  'persistShopCroEvent',
  'prisma.shopTrackingEvent.create',
  'eventName: event.event_name',
  'items: event.items',
  'filters: event.filters',
]));
expect('shop CRO persistence failure logs safe retention failure', includesAll(shopCro, [
  'logShopCroPersistenceFailure',
  'getTrackingFailureLogRetentionMetadata',
  "provider: 'SHOP_CRO'",
  "errorCode: 'SHOP_CRO_PERSISTENCE_FAILED'",
  'safePayload',
]));

const route = read('app/api/tracking/events/route.ts');
expect('tracking route uses shop CRO sanitizer and persistence', includesAll(route, [
  'sanitizeShopCroEvent',
  'persistShopCroEvent',
  'retainedItemCount',
  'intentOnly',
  'persisted: persistence.ok',
]));
expect('tracking route still applies server traffic filter', includesAll(route, [
  'shouldSkipServerTrackingRequest(request)',
  'skipped: true',
]));
expect('tracking route redacts IP and never stores raw UA in shop event', includesAll(route, [
  'redactIp',
  'hasUserAgent',
]) && !route.includes('userAgent: userAgent'));

const client = read('lib/tracking/shop-events.ts');
expect('client shop events include Phase 8 CRO event names', includesAll(client, [
  "| 'add_to_cart'",
  "| 'clear_filter'",
  "| 'page_change'",
  'trackShopAddToCart',
  'trackShopClearFilter',
  'trackShopPageChange',
]));
expect('view_item_list sends actual rendered items and filters', includesAll(client, [
  'products.slice(0, 20).map',
  'filters: cleanFilters(filters)',
  'page: filters?.page',
]));
expect('buy_now_click remains intent-only and not purchase', includesAll(client, [
  'Intent-only event. Do not map this to Purchase/Lead conversion.',
  "pushShopEvent('buy_now_click'",
  'intent_only: true',
]) && !client.includes("pushShopEvent('purchase'"));
expect('sort_apply stores public sort key only', includesAll(client, [
  'PUBLIC_SORT_VALUES',
  'ensurePublicSort',
  "sort_value: ensurePublicSort(sortValue)",
]) && !client.includes('discount_desc'));

const shopGrid = read('app/components/shop/ShopGrid.tsx');
expect('ShopGrid passes filter context to list/empty/sort/filter/page events', includesAll(shopGrid, [
  'shopAnalyticsFilters',
  'trackShopViewItemList(displayProducts, SHOP_LIST_NAME, shopAnalyticsFilters)',
  'trackShopEmptyResult(q, totalCount, shopAnalyticsFilters)',
  'trackShopSortApply(value, totalCount, shopAnalyticsFilters)',
  'trackShopFilterApply(canonicalKey, value, totalCount, shopAnalyticsFilters)',
  'trackShopPageChange(page + 1, totalCount',
]));

const productCard = read('app/components/shop/ProductCard.tsx');
expect('ProductCard tracks shop add_to_cart success through CartStepper callback', includesAll(productCard, [
  'trackShopAddToCart',
  'onAddToCartSuccess',
]));

const cartStepper = read('components/cart/CartStepper.tsx');
expect('CartStepper exposes success callback without firing before mutation success', includesAll(cartStepper, [
  'onAddToCartSuccess?:',
  'notifyAddToCartSuccess',
  'if (success)',
]));

const activeFilters = read('app/components/shop/ActiveFilters.tsx');
expect('ActiveFilters tracks clear_filter for single and all filters', includesAll(activeFilters, [
  'trackShopClearFilter',
  "trackShopClearFilter(filter.param, totalProducts)",
  "trackShopClearFilter('all', totalProducts)",
]));

const pkg = JSON.parse(read('package.json') || '{}');
expect('package exposes qa:shop-cro-analytics', pkg.scripts?.['qa:shop-cro-analytics'] === 'node scripts/shop-cro-analytics-audit.mjs');
expect('audit:shop-release includes qa:shop-cro-analytics', pkg.scripts?.['audit:shop-release']?.includes('qa:shop-cro-analytics'));

const report = read('PHASE8_SHOP_CRO_ANALYTICS_SERVER_RELIABILITY_REPORT.md');
expect('Phase 8 delivery report exists', includesAll(report, ['Phase 8', 'Shop CRO Analytics', 'QA']));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
