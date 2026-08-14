#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function read(file) {
  return fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
}

function addCheck(name, passed, detail = '') {
  checks.push({ name, passed, detail });
}

function includes(file, pattern) {
  return read(file).includes(pattern);
}

function regex(file, pattern) {
  return pattern.test(read(file));
}

const lib = 'lib/shopMerchandising.ts';
const route = 'app/api/shop/merchandising/route.ts';
const component = 'app/components/shop/ShopMerchandisingSections.tsx';
const grid = 'app/components/shop/ShopGrid.tsx';
const pkg = JSON.parse(read('package.json'));
const release = pkg.scripts?.['audit:shop-release'] || '';
const compText = read(component);
const libText = read(lib);

addCheck('server merchandising library exists', fs.existsSync(path.join(root, lib)));
addCheck('server merchandising api route exists', fs.existsSync(path.join(root, route)));
addCheck('client component fetches server merchandising endpoint', includes(component, '/api/shop/merchandising'));
addCheck('client component no longer receives current page products prop', !regex(component, /function\s+ShopMerchandisingSections\s*\(\{\s*products/) && !regex(component, /interface\s+ShopMerchandisingSectionsProps\s*\{[^}]*products\s*:/s));
addCheck('old current-page buildSections removed', !includes(component, 'function buildSections'));
addCheck('old current-page productScore removed', !includes(component, 'function productScore'));
addCheck('ShopGrid passes exclude ids and total count only', includes(grid, 'excludeProductIds={displayProducts.map((product) => product.id)}') && includes(grid, 'totalProducts={totalCount}'));
addCheck('server route returns source marker', includes(route, 'X-Shop-Merchandising-Source') && includes(route, 'server_catalog'));
addCheck('server route uses sanitized context', includes(route, 'sanitizeShopMerchandisingContext'));
addCheck('server route uses payload headers', includes(route, 'getShopPayloadHeaders'));
addCheck('server route uses cache control', includes(route, 'SHOP_MERCHANDISING_CACHE_CONTROL'));
addCheck('library uses Prisma full catalog queries', includes(lib, 'prisma.product.findMany'));
addCheck('library selects listing-light product fields', includes(lib, 'SHOP_MERCHANDISING_PRODUCT_SELECT'));
addCheck('library caps excluded products', includes(lib, 'SHOP_MERCHANDISING_MAX_EXCLUDES'));
addCheck('library has contextual personalized section', includes(lib, 'recommended-for-you') && includes(lib, 'contextual_filters'));
addCheck('library has category merchandising section', includes(lib, 'popular-in-category') && includes(lib, 'category_performance'));
addCheck('library has brand merchandising section', includes(lib, 'brand-picks') && includes(lib, 'brand_affinity'));
addCheck('library has deal and trending fallback sections', includes(lib, 'todays-deals') && includes(lib, 'trending-now'));
addCheck('library uses deterministic small-catalog fallback', includes(lib, 'Small development catalogs') && includes(lib, 'fallbackRows'));
addCheck('library does not select heavy description body for merchandising cards', !regex(lib, /description:\s*true/) && !regex(lib, /seoIntro:\s*true/) && !regex(lib, /structuredDataJsonLd:\s*true/));
addCheck('trust resolver reused for merchandising payload', includes(lib, 'resolveProductTrustBadges'));
addCheck('client tracks merchandising impressions', includes(component, 'trackShopViewItemList'));
addCheck('client tracks merchandising item clicks', includes(component, 'trackShopSelectItem'));
addCheck('client renders server source marker', includes(component, 'data-merchandising-source="server_catalog"'));
addCheck('client shows personalized context copy', includes(component, 'Based on current filters'));
addCheck('qa:shop-merchandising script registered', pkg.scripts?.['qa:shop-merchandising'] === 'node scripts/shop-merchandising-audit.mjs');
addCheck('shop release gate includes merchandising audit', release.includes('qa:shop-merchandising'));

const passed = checks.filter((check) => check.passed).length;
for (const check of checks) {
  console.log(`${check.passed ? '✅' : '❌'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
console.log(`\nShop merchandising audit: ${passed}/${checks.length} checks passed`);

if (passed !== checks.length) {
  process.exit(1);
}
