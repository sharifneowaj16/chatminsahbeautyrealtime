import fs from 'node:fs';

const checks = [];
function check(name, condition, evidence = '') {
  checks.push({ name, passed: Boolean(condition), evidence });
}
function read(path) { return fs.readFileSync(path, 'utf8'); }

const productsRoute = read('app/api/products/route.ts');
const searchRoute = read('app/api/search/route.ts');
const shopGrid = read('app/components/shop/ShopGrid.tsx');
const dbFallback = read('lib/search/db-fallback.ts');
const packageJson = JSON.parse(read('package.json'));

check('products API defines a server facet response type', /type ShopFacets\s*=\s*{[\s\S]*categories:[\s\S]*brands:[\s\S]*priceRanges:[\s\S]*availability:[\s\S]*ratings:/.test(productsRoute));
check('products API builds facets with database groupBy categoryId', /prisma\.product\.groupBy\(\{[\s\S]*by:\s*\['categoryId'\]/.test(productsRoute));
check('products API builds facets with database groupBy brandId', /prisma\.product\.groupBy\(\{[\s\S]*by:\s*\['brandId'\]/.test(productsRoute));
check('products API computes price range facets server-side', /SHOP_PRICE_RANGES\.map\(\(range\)[\s\S]*prisma\.product\.count\(\{ where: mergePriceFilter/.test(productsRoute));
check('products API includes facets in JSON response', /facets,\s*\n\s*pagination:/.test(productsRoute));
check('products API exposes top-level total/page/limit/totalPages with facets', /total:\s*totalCount,[\s\S]*totalPages:\s*Math\.ceil\(totalCount \/ limit\),[\s\S]*facets,/.test(productsRoute));

check('search API aggregates category facets by categorySlug', /terms:\s*\{ field:\s*'categorySlug'/.test(searchRoute));
check('search API aggregates brand facets by brandSlug', /terms:\s*\{ field:\s*'brandSlug'/.test(searchRoute));
check('search API adds category label sub-aggregation', /category_label:\s*\{ terms:\s*\{ field:\s*'categoryName\.keyword'/.test(searchRoute));
check('search API adds brand label sub-aggregation', /brand_label:\s*\{ terms:\s*\{ field:\s*'brand\.keyword'/.test(searchRoute));
check('search API returns normalized labeled category facets', /categories:\s*response\.aggregations\?\.categories\?\.buckets\.map\(\(bucket\)[\s\S]*label:\s*getAggregationLabel\(bucket, 'category_label'\)[\s\S]*value:\s*bucket\.key/.test(searchRoute));
check('search API returns normalized labeled brand facets', /brands:\s*response\.aggregations\?\.brands\?\.buckets\.map\(\(bucket\)[\s\S]*label:\s*getAggregationLabel\(bucket, 'brand_label'\)[\s\S]*value:\s*bucket\.key/.test(searchRoute));
check('search API includes availability and rating facet groups', /availability:\s*Object\.entries\(response\.aggregations\?\.availability\?\.buckets/.test(searchRoute) && /ratings:\s*Object\.entries\(response\.aggregations\?\.ratings\?\.buckets/.test(searchRoute));

check('database fallback returns the same facet groups as search API', /skinTypes:\s*\[\],[\s\S]*concerns:\s*\[\],[\s\S]*availability:[\s\S]*ratings:/.test(dbFallback));
check('database fallback facet options include label and value', /function countFacet\(values: string\[\]\): Array<\{ label: string; value: string; count: number \}>/.test(dbFallback));

check('ShopGrid stores full server facet state, not only brands', /useState<ShopFacetState>\(EMPTY_SHOP_FACETS\)/.test(shopGrid));
check('ShopGrid normalizes facets from search API responses', /setFacets\(normalizeApiFacets\(data\.facets\)\);/.test(shopGrid));
check('ShopGrid normalizes facets from products API responses', (shopGrid.match(/setFacets\(normalizeApiFacets\(data\.facets\)\);/g) || []).length >= 2);
check('ShopGrid category options come from server facets', /mergeActiveFacetOptions\(facets\.categories, selectedCategories\)/.test(shopGrid));
check('ShopGrid brand options come from server facets', /mergeActiveFacetOptions\(facets\.brands, selectedBrands\)/.test(shopGrid));
check('ShopGrid keeps active filters visible when count is zero', /activeValues\.forEach[\s\S]*count:\s*0/.test(shopGrid));
check('ShopGrid no longer derives category options from current-page allProducts', !/const categoryOptions = useMemo\(\(\) => \{[\s\S]*allProducts\.forEach/.test(shopGrid));
check('ShopGrid no longer derives brand options from current-page allProducts', !/const brandOptions = useMemo\(\(\) => \{[\s\S]*allProducts\.forEach/.test(shopGrid));

check('package.json exposes qa:shop-facets command', packageJson.scripts?.['qa:shop-facets'] === 'node scripts/shop-facets-audit.mjs');

const passed = checks.filter((item) => item.passed).length;
const failed = checks.length - passed;
for (const item of checks) {
  console.log(`${item.passed ? '✅' : '❌'} ${item.name}${item.evidence ? ` — ${item.evidence}` : ''}`);
}
console.log(`\nShop facets audit: ${passed}/${checks.length} checks passed`);
if (failed > 0) process.exit(1);
