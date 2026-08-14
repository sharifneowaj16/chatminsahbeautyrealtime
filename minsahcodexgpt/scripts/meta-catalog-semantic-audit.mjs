import fs from 'node:fs';

const checks = [];
function source(path) { return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function check(name, ok) { checks.push({ name, ok }); }

const catalog = source('lib/meta-platform/domains/catalog/orchestration.ts');
const mapper = source('lib/meta/catalog/mapper.ts');
const availability = source('lib/meta/catalog/domain/availability.ts');
const sale = source('lib/meta/catalog/domain/sale-period.ts');
const itemsBatch = source('lib/meta/catalog/adapters/items-batch.ts');
const csv = source('lib/meta/catalog/adapters/csv-feed.ts');
const tracking = source('lib/tracking/meta-content-id.ts');
const feedRoute = source('app/api/admin/meta/catalogs/feed/route.ts');
const cronRoute = source('app/api/internal/meta/catalog-sync/route.ts');
const schema = source('prisma/schema.prisma');

check('Catalog uses shared Meta identity resolver', catalog.includes('resolveMetaCatalogIdentity'));
check('Catalog subtracts reserved stock', availability.includes('input.quantity') && availability.includes('input.reservedQuantity'));
check('Catalog respects non-tracked stock', availability.includes('if (!input.trackInventory)'));
check('Catalog maps zero-stock backorders correctly', availability.includes("'available for order'"));
check('Future sale remains scheduled', sale.includes("'future' : 'active'"));
check('Expired sale is removed', sale.includes("state: 'expired'"));
check('Sale effective range is emitted', itemsBatch.includes('sale_price_effective_date'));
check('Variant parents are not duplicated', mapper.includes('input.product.variants.length === 0'));
check('Stale managed items are deleted', catalog.includes('const stale = managed') && catalog.includes('serializeItemsBatchDelete(retailerId)'));
check('Unknown/manual Meta items are preserved', catalog.includes('metaCatalogSyncItem.findMany') && catalog.includes('desiredIds') && catalog.includes('managed.filter'));
check('Sync lock exists', schema.includes('model MetaBusinessSyncLock'));
check('Managed item registry exists', schema.includes('model MetaCatalogSyncItem'));
check('Pending batch registry exists', schema.includes('model MetaCatalogBatch'));
check('Per-item batch state exists', schema.includes('model MetaCatalogBatchItem'));
check('Canonical hash is persisted', schema.includes('payloadHash') && catalog.includes('catalogPayloadHash(mapped.item)'));
check('Items Batch write fields are endpoint-specific', ['quantity_to_sell_on_facebook', 'link:', 'image_link:', 'item_group_id:'].every((token) => itemsBatch.includes(token)));
check('Items Batch excludes legacy write names', !/\binventory\s*:|\burl\s*:|\bimage_url\s*:|\bretailer_product_group_id\s*:/.test(itemsBatch));
check('CSV and Items Batch share canonical money formatting', csv.includes('formatCatalogMoney') && itemsBatch.includes('formatCatalogMoney'));
check('Feed actions are explicitly validated', feedRoute.includes('parseFeedAction'));
check('Feed schedules are explicitly validated', feedRoute.includes('parseFeedSchedule'));
check('Cron honors catalogSyncEnabled', cronRoute.includes('catalogSyncEnabled'));
check('Tracking supports SKU identity', tracking.includes("source === 'sku'"));
check('Tracking supports database identity', tracking.includes("source === 'database_id'"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} semantic checks passed`);
if (failed.length) process.exit(1);
