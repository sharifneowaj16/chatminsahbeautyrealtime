#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const itemsBatch = read('lib/meta/catalog/adapters/items-batch.ts');
const csv = read('lib/meta/catalog/adapters/csv-feed.ts');
const availability = read('lib/meta/catalog/domain/availability.ts');
const sale = read('lib/meta/catalog/domain/sale-period.ts');
const mapper = read('lib/meta/catalog/mapper.ts');
const catalog = read('lib/meta-platform/domains/catalog/orchestration.ts');
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260717010000_meta_v6_phase2_catalog_domain/migration.sql');

const checks = [
  ['Canonical mapper exists', mapper.includes('mapProductToCatalogItems')],
  ['Items Batch adapter is separate', itemsBatch.includes('serializeItemsBatchUpdate')],
  ['CSV adapter is separate', csv.includes('serializeCsvRecord')],
  ['Read model adapter is separate', fs.existsSync('lib/meta/catalog/adapters/product-item-read.ts')],
  ['Items Batch uses quantity_to_sell_on_facebook', itemsBatch.includes('quantity_to_sell_on_facebook')],
  ['Items Batch uses link/image_link/item_group_id', ['link:', 'image_link:', 'item_group_id:'].every((token) => itemsBatch.includes(token))],
  ['Items Batch has no legacy write fields', !/\binventory\s*:|\burl\s*:|\bimage_url\s*:|\bretailer_product_group_id\s*:/.test(itemsBatch)],
  ['Money is formatted with two decimals and currency', itemsBatch.includes('formatCatalogMoney') && csv.includes('formatCatalogMoney')],
  ['Zero-stock backorder is available for order', availability.includes("'available for order'")],
  ['Future sale is retained with effective range', sale.includes('effectiveDate') && sale.includes("state: input.offerStartDate > input.now ? 'future' : 'active'")],
  ['Expired sale is omitted', sale.includes("return { state: 'expired' }")],
  ['Variant lifecycle and sale schema fields exist', ['salePrice', 'offerStartDate', 'offerEndDate', 'allowBackorder', 'isActive', 'deletedAt', 'availabilityMode', 'preorderAvailableOn', 'condition', 'gtin', 'mpn', 'barcode'].every((token) => schema.match(/model ProductVariant \{[\s\S]*?\n\}/)?.[0]?.includes(token))],
  ['Typed catalog item and batch statuses exist', schema.includes('enum MetaCatalogItemStatus') && schema.includes('enum MetaCatalogBatchStatus')],
  ['Per-item batch status registry exists', schema.includes('model MetaCatalogBatchItem')],
  ['Canonical payload hash is persisted', catalog.includes('catalogPayloadHash(mapped.item)') && schema.includes('payloadHash')],
  ['Unchanged active items are skipped', catalog.includes("previous?.payloadHash === entry.payloadHash") && catalog.includes("previous.status === 'ACTIVE'")],
  ['Only managed stale items are deleted', catalog.includes('metaCatalogSyncItem.findMany') && catalog.includes('const stale = managed') && catalog.includes('serializeItemsBatchDelete(retailerId)')],
  ['Invalid mapped items are preserved from stale deletion', catalog.includes('...plan.invalidItems.map((entry) => entry.retailerId)')],
  ['Forward-only migration includes lifecycle backfill', migration.includes('preOrderOption') && migration.includes("'PREORDER'")],
  ['CSV/Items Batch parity test exists', read('tests/meta-v6/phase2-catalog-domain.test.ts').includes('CSV and Items Batch preserve the same commerce semantics')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
console.log(`\n${checks.length - failed}/${checks.length} Phase 2 checks passed`);
if (failed) process.exit(1);
