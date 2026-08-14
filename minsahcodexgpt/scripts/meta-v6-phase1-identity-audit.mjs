#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const env = read('.env.example');
const shared = read('lib/tracking/meta-content-id.ts');
const envHelper = read('lib/tracking/meta-content-id-env.ts');
const serverHelper = read('lib/tracking/meta-content-id-server.ts');
const catalog = read('lib/meta-business/catalog.ts');
const itemsBatchAdapter = read('lib/meta/catalog/adapters/items-batch.ts');
const wishlist = read('lib/tracking/events.ts');
const searchClicks = read('app/api/search/clicks/route.ts');
const instrumentation = read('instrumentation.ts');

check('shared canonical identity resolver remains present',
  shared.includes('resolveMetaCatalogIdentity') && shared.includes('buildMetaCatalogData'));
check('server and public environment variables are documented',
  env.includes('META_CATALOG_ID_SOURCE=') && env.includes('NEXT_PUBLIC_META_CATALOG_ID_SOURCE='));
check('identity environment parity validator exists',
  exists('lib/tracking/meta-content-id-env.ts') &&
  envHelper.includes('must match') &&
  envHelper.includes('both required'));
check('server-only identity source wrapper exists',
  serverHelper.includes("import 'server-only'") &&
  serverHelper.includes('META_CATALOG_ID_SOURCE') &&
  serverHelper.includes('NEXT_PUBLIC_META_CATALOG_ID_SOURCE'));
check('production boot validates identity environment',
  instrumentation.includes('validateMetaCatalogIdentityEnvironment'));
check('catalog sync uses server identity source',
  catalog.includes('getServerMetaCatalogIdSource()'));
check('wishlist uses canonical catalog payload builder',
  (wishlist.includes('buildMetaCatalogData') || wishlist.includes('buildMetaCommerceBrowserEvent')) &&
  !/content_ids\s*:\s*\[\s*productId\s*\]/.test(wishlist));
check('search click tracking uses canonical catalog payload builder',
  searchClicks.includes('buildMetaCatalogData') &&
  searchClicks.includes('activeProduct.sku') &&
  !/content_ids\s*:\s*\[\s*click\.productId\s*\]/.test(searchClicks));
check('SKU rename reconciliation DELETE foundation remains present',
  itemsBatchAdapter.includes("method: 'DELETE'") &&
  catalog.includes('serializeItemsBatchDelete') &&
  (catalog.includes('metaCatalogSyncItem') || catalog.includes('MetaCatalogSyncItem')));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\n${checks.length - failed.length}/${checks.length} Phase 1 checks passed`);
if (failed.length) process.exit(1);
