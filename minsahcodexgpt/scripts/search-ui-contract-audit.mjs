#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass, detail });
}

const searchPagePath = 'app/(storefront)/search/page.tsx';
const routePath = 'app/api/search/route.ts';
const fallbackPath = 'lib/search/db-fallback.ts';
const pkgPath = 'package.json';

const searchPage = exists(searchPagePath) ? read(searchPagePath) : '';
const route = exists(routePath) ? read(routePath) : '';
const fallback = exists(fallbackPath) ? read(fallbackPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

check('Search page exists', exists(searchPagePath), searchPagePath);
check('Search page has server-side filter apply helper', /applyServerFilters/.test(searchPage) && /performSearch\(inputValue, 1, nextFilters\)/.test(searchPage), searchPagePath);
check('URL params include category brand price stock sort page limit', ['category', 'brand', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page', 'limit'].every((key) => searchPage.includes(`p.set('${key}'`) || searchPage.includes(`p.set("${key}"`)), searchPagePath);
check('API search request is driven by URLSearchParams', /fetch\(`\/api\/search\?\$\{params\.toString\(\)\}`\)/.test(searchPage), searchPagePath);
check('Search route receives server-side filters', ['category', 'subcategory', 'brand', 'minPrice', 'maxPrice', 'inStock', 'tags'].every((key) => route.includes(`searchParams.get('${key}')`) || route.includes(`searchParams.get("${key}")`)), routePath);
check('Elasticsearch applies filters before returning result page', /filter\.push/.test(route) && /from:\s*\(page - 1\) \* limit/.test(route) && /size:\s*limit/.test(route), routePath);
check('Search route exposes server facets from aggregations', /aggs:\s*{[\s\S]*categories:[\s\S]*brands:[\s\S]*price_ranges:/.test(route) && /facets:\s*{[\s\S]*categories:[\s\S]*brands:[\s\S]*priceRanges:/.test(route), routePath);
check('Pagination remains server-side', /performSearch\(inputValue, page - 1\)/.test(searchPage) && /performSearch\(inputValue, page \+ 1\)/.test(searchPage), searchPagePath);
check('Search UI no longer displays locally filtered result counts', !/locally filtered|hasLocalMultiFilters|Clear Local Filters|Quick Multi Sort & Filters/.test(searchPage), searchPagePath);
check('Search UI does not locally filter the returned product page', !/\.filter\(\(product\)/.test(searchPage) && !/selectedCategories|selectedBrands|selectedSortFlags|priceMinInput|priceMaxInput|mfCategory|mfBrand|mfSort|mfMinPrice|mfMaxPrice/.test(searchPage), searchPagePath);
check('Search UI does not locally sort the returned product page', !/displayProducts\s*=\s*useMemo\([\s\S]*\.sort\(/.test(searchPage), searchPagePath);
check('Product grid renders API products directly', /const displayProducts = results\?\.products \?\? \[\]/.test(searchPage) && /displayProducts\.map\(\(product, index\)/.test(searchPage), searchPagePath);
check('Quick filters use server facets, not current page counts', /const categoryOptions = results\?\.facets\?\.categories \?\? \[\]/.test(searchPage) && /const brandOptions = results\?\.facets\?\.brands \?\? \[\]/.test(searchPage), searchPagePath);
check('Sort chips call server-side apply helper without stale state search', /onClick=\{\(\) => applyServerFilters\(\{ sort: opt\.value \}\)\}/.test(searchPage), searchPagePath);
check('Popularity sort is accepted by Elasticsearch route', /case ['"]popularity['"]:[\s\S]*popularityScore[\s\S]*salesCount[\s\S]*searchClickCount[\s\S]*viewCount/.test(route), routePath);
check('Popularity sort is accepted by DB fallback', /case ['"]popularity['"]:[\s\S]*deliveredOrderCount[\s\S]*orderCount[\s\S]*viewCount/.test(fallback), fallbackPath);
check('package.json has qa:search-ui-contract', pkg.scripts?.['qa:search-ui-contract'] === 'node scripts/search-ui-contract-audit.mjs', pkgPath);
check('package.json has qa:phase28 alias', pkg.scripts?.['qa:phase28'] === 'node scripts/search-ui-contract-audit.mjs', pkgPath);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nPhase 28 audit: ${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  process.exitCode = 1;
}
