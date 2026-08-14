#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
function check(name, condition, evidence = '') {
  checks.push({ name, passed: Boolean(condition), evidence });
}
function read(path) { return fs.readFileSync(path, 'utf8'); }

const searchRoute = read('app/api/search/route.ts');
const productsRoute = read('app/api/products/route.ts');
const dbFallback = read('lib/search/db-fallback.ts');
const shopGrid = read('app/components/shop/ShopGrid.tsx');
const sortDropdown = read('app/components/shop/SortDropdown.tsx');
const esMapping = read('lib/elasticsearch.ts');
const esUtils = read('lib/elasticsearch/utils.ts');
const esIndexing = read('lib/elasticsearch/indexing.ts');
const tracking = read('lib/tracking/shop-events.ts');
const pkg = JSON.parse(read('package.json'));

const publicSorts = [
  'featured',
  'best-selling',
  'newest',
  'price-low-high',
  'price-high-low',
  'highest-rated',
  'biggest-discount',
];

check('ShopGrid exposes all public shop sort options', publicSorts.every((sort) => shopGrid.includes(`id: '${sort}'`)), 'app/components/shop/ShopGrid.tsx');
check('SortDropdown exposes all public shop sort options', publicSorts.every((sort) => sortDropdown.includes(`value: '${sort}'`)), 'app/components/shop/SortDropdown.tsx');

check('Search route maps biggest-discount to discount_desc', /case ['"]biggest-discount['"]:[\s\S]*return ['"]discount_desc['"]/.test(searchRoute), 'app/api/search/route.ts');
check('Search route no longer maps biggest-discount to relevance', !/case ['"]biggest-discount['"]:[\s\S]{0,120}return ['"]relevance['"]/.test(searchRoute), 'app/api/search/route.ts');
check('Search route sorts discount_desc by numeric discount desc', /case ['"]discount_desc['"]:[\s\S]*\{\s*discount:\s*['"]desc['"]\s*\}/.test(searchRoute), 'app/api/search/route.ts');
check('Search route invalid sort falls back to relevance safely', /default:\s*\n\s*return ['"]relevance['"]/.test(searchRoute), 'app/api/search/route.ts');

check('DB fallback maps biggest-discount to discount_desc', /case ['"]biggest-discount['"]:[\s\S]*return ['"]discount_desc['"]/.test(dbFallback), 'lib/search/db-fallback.ts');
check('DB fallback sorts discount_desc by discountPercentage desc', /case ['"]discount_desc['"]:[\s\S]*discountPercentage:\s*['"]desc['"]/.test(dbFallback), 'lib/search/db-fallback.ts');
check('DB fallback invalid sort falls back to relevance safely', /default:\s*\n\s*return ['"]relevance['"]/.test(dbFallback), 'lib/search/db-fallback.ts');

check('Products API maps biggest-discount to discountPercentage desc', /case ['"]biggest-discount['"]:[\s\S]*sortBy:\s*['"]discountPercentage['"][\s\S]*sortOrder:\s*['"]desc['"]/.test(productsRoute), 'app/api/products/route.ts');
check('Products API invalid public sort falls back to featured', /case ['"]featured['"]:\s*\n\s*default:\s*\n\s*return \{ sortBy:\s*['"]featured['"], sortOrder:\s*['"]desc['"] \}/.test(productsRoute), 'app/api/products/route.ts');
check('Products API featured fallback uses deterministic merchandising order', /featured:\s*\[[\s\S]*isFeatured:\s*['"]desc['"][\s\S]*flashSaleEligible:\s*['"]desc['"][\s\S]*deliveredOrderCount:\s*['"]desc['"]/.test(productsRoute), 'app/api/products/route.ts');

check('Elasticsearch mapping includes numeric discount field', /discount:\s*\{\s*type:\s*['"]integer['"]/.test(esMapping), 'lib/elasticsearch.ts');
check('Search parameter validator allows internal discount_desc', /'discount_desc'/.test(esUtils), 'lib/elasticsearch/utils.ts');
check('Secondary Elasticsearch helper supports discount_desc', /case ['"]discount_desc['"]:[\s\S]*discount:\s*['"]desc['"]/.test(esIndexing), 'lib/elasticsearch/indexing.ts');

check('ShopGrid maps public biggest-discount to search API discount_desc', /case ['"]biggest-discount['"]:[\s\S]*return ['"]discount_desc['"]/.test(shopGrid), 'app/components/shop/ShopGrid.tsx');
check('ShopGrid keeps public sort value in URL writes', /updateUrlFilters\(\{ sort:\s*item\.id === ['"]featured['"] \? null : item\.id \}\)/.test(shopGrid), 'app/components/shop/ShopGrid.tsx');
check('ShopGrid forwards internal mapped sort only to search API requests', /params\.set\(['"]sort['"], mapShopSortToSearchApiSort\(sort as SortOption\)\)/.test(shopGrid), 'app/components/shop/ShopGrid.tsx');
check('ShopGrid carries ES discount into ProductCard model', /discount:\s*p\.discount \?\? p\.discountPercentage/.test(shopGrid) && /typeof p\.discount === ['"]number['"]/.test(shopGrid), 'app/components/shop/ShopGrid.tsx');

check('sort_apply tracking stores the public sort value', /trackShopSortApply\(value(?:,|\))/.test(shopGrid) && /ensurePublicSort\(sortValue\)/.test(tracking) && /sort_value:\s*ensurePublicSort\(sortValue\)/.test(tracking), 'ShopGrid + shop-events');
check('package.json exposes qa:shop-sort command', pkg.scripts?.['qa:shop-sort'] === 'node scripts/shop-sort-parity-audit.mjs');
check('audit:shop-release includes qa:shop-sort', String(pkg.scripts?.['audit:shop-release'] || '').includes('npm run qa:shop-sort'));

const passed = checks.filter((item) => item.passed).length;
const failed = checks.length - passed;
for (const item of checks) {
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}${item.evidence ? ` — ${item.evidence}` : ''}`);
}
console.log(`\nShop sort parity audit: ${passed}/${checks.length} checks passed`);
if (failed > 0) process.exit(1);
