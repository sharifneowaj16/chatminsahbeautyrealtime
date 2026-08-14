#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = (relativePath) => path.join(root, relativePath);
const exists = (relativePath) => fs.existsSync(file(relativePath));
const read = (relativePath) => exists(relativePath) ? fs.readFileSync(file(relativePath), 'utf8') : '';

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

function hasAll(text, parts) {
  return parts.every((part) => text.includes(part));
}

function hasAny(text, parts) {
  return parts.some((part) => text.includes(part));
}

const routePath = 'app/api/search/route.ts';
const esPath = 'lib/elasticsearch.ts';
const transformerPath = 'lib/search/productTransformer.ts';
const activeFilterPath = 'lib/search/activeProductFilter.ts';
const suggestionsPath = 'app/api/search/suggestions/route.ts';
const fallbackPath = 'lib/search/db-fallback.ts';
const pkgPath = 'package.json';

const route = read(routePath);
const es = read(esPath);
const transformer = read(transformerPath);
const activeFilter = read(activeFilterPath);
const suggestions = read(suggestionsPath);
const fallback = read(fallbackPath);
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

check('Search route exists', exists(routePath), routePath);
check('Elasticsearch mapping exists', exists(esPath), esPath);
check('Product transformer exists', exists(transformerPath), transformerPath);
check('Active product filter helper exists', exists(activeFilterPath), activeFilterPath);
check('Suggestions route exists', exists(suggestionsPath), suggestionsPath);

check(
  'Phase 19: category/subcategory/tags filters do not use invalid .keyword suffix',
  !/category\.keyword|subcategory\.keyword|tags\.keyword/.test(route + '\n' + read('lib/elasticsearch/indexing.ts')),
  'category, subcategory, and tags are keyword fields already'
);

check(
  'Phase 19: ES mapping keeps category/subcategory/tags as keyword fields',
  /category:\s*\{\s*type:\s*['"]keyword['"]/.test(es) &&
    /subcategory:\s*\{\s*type:\s*['"]keyword['"]/.test(es) &&
    /tags:\s*\{\s*type:\s*['"]keyword['"]/.test(es),
  esPath
);

check(
  'Phase 19: brand keeps keyword subfield for exact filtering/facets',
  /brand:[\s\S]*fields:[\s\S]*keyword:[\s\S]*type:\s*['"]keyword['"]/.test(es),
  esPath
);

check(
  'Phase 19: route parses all core filter parameters',
  ['category', 'subcategory', 'brand', 'minPrice', 'maxPrice', 'inStock', 'rating', 'tags', 'sort', 'page', 'limit'].every((key) =>
    route.includes(`searchParams.get('${key}')`) || route.includes(`searchParams.get("${key}")`)
  ),
  routePath
);

check(
  'Phase 19: route applies category/subcategory/tags exact filters on direct fields',
  /filter\.push\(\{\s*term:\s*\{\s*['"]category['"]:\s*category\s*\}\s*\}\)/.test(route) &&
    /filter\.push\(\{\s*term:\s*\{\s*['"]subcategory['"]:\s*subcategory\s*\}\s*\}\)/.test(route) &&
    /filter\.push\(\{\s*terms:\s*\{\s*['"]tags['"]:\s*tags\s*\}\s*\}\)/.test(route),
  routePath
);

check(
  'Phase 19: route applies brand, price, stock, rating filters',
  /brand\.keyword/.test(route) &&
    /range:\s*\{\s*price/.test(route) &&
    /term:\s*\{\s*inStock:\s*true\s*\}/.test(route) &&
    /range:\s*\{\s*rating/.test(route),
  routePath
);

check(
  'Phase 19: facets are server-side ES aggregations for category/brand/price',
  /aggs:\s*\{[\s\S]*categories:[\s\S]*terms:\s*\{\s*field:\s*['"]category(?:Slug)?['"][\s\S]*brands:[\s\S]*field:\s*['"](?:brandSlug|brand\.keyword)['"][\s\S]*price_ranges:[\s\S]*field:\s*['"]price['"]/.test(route),
  routePath
);

check(
  'Phase 19: DB fallback supports same core filters',
  exists(fallbackPath) &&
    ['category', 'subcategory', 'brand', 'minPrice', 'maxPrice', 'inStock', 'rating', 'tags'].every((token) => fallback.includes(token)) &&
    hasAll(fallback, ['buildWhere', 'buildOrderBy', 'price:', 'quantity: { gt: 0 }']),
  fallbackPath
);

check(
  'Phase 20: ES active-product filters require active, non-deleted, published/active, public visibility',
  hasAll(activeFilter, [
    'buildActiveProductESFilters',
    'isActive: true',
    "field: 'deletedAt'",
    'ACTIVE_SEARCH_STATUSES',
    'PUBLIC_SEARCH_VISIBILITY',
  ]) &&
    /terms:\s*\{\s*status/.test(activeFilter) &&
    /term:\s*\{\s*visibility/.test(activeFilter),
  activeFilterPath
);

check(
  'Phase 20: Prisma active-product fallback is active and non-deleted only',
  hasAll(activeFilter, ['ACTIVE_PRODUCT_PRISMA_WHERE', 'isActive: true', 'deletedAt: null']) && fallback.includes('ACTIVE_PRODUCT_PRISMA_WHERE'),
  activeFilterPath
);

check(
  'Phase 20: transformer emits active/deleted/status/visibility/stock fields',
  hasAll(transformer, ['isActive:', 'deletedAt:', 'status,', 'visibility,', 'stock:', 'inStock:']) &&
    hasAll(transformer, ['isSellableSearchProduct', "'deleted'", "'inactive'", "'hidden'"]),
  transformerPath
);

check(
  'Phase 20: search route always prepends active-product filters before user filters',
  hasAll(route, ['buildActiveProductESFilters', 'const activeProductFilters = buildActiveProductESFilters()', 'const filter: any[] = [...activeProductFilters]']),
  routePath
);

check(
  'Phase 20: zero-result/popular fallback searches stay active-product scoped',
  route.match(/filter:\s*activeProductFilters/g)?.length >= 2,
  routePath
);

check(
  'Phase 20: suggestions/autocomplete excludes inactive/deleted/hidden products',
  hasAll(suggestions, ['buildActiveProductESFilters', 'isActiveSearchHit', '.filter((option) => isActiveSearchHit(option._source))']) &&
    /filter:\s*\[[\s\S]*\.\.\.buildActiveProductESFilters\(\)/.test(suggestions),
  suggestionsPath
);

check(
  'Phase 20: product index mapping includes visibility fields',
  hasAll(es, ['isActive:', 'deletedAt:', 'status:', 'visibility:', 'stock:', 'inStock:']),
  esPath
);

check('package.json exposes qa:search-filter', pkg.scripts?.['qa:search-filter'] === 'node scripts/search-filter-audit.mjs', pkgPath);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nSearch filter audit: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;
