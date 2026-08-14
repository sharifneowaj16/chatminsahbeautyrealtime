#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, passed) => checks.push({ name, passed });
const hasAll = (text, parts) => parts.every((part) => text.includes(part));

const searchPage = read('app/(storefront)/search/page.tsx');
const clickHelper = read('lib/search/click-tracking.ts');
const pkg = JSON.parse(read('package.json'));

check('frontend no longer hardcodes position 0', !searchPage.includes('position: 0'));
check('frontend no longer hardcodes resultCount 1', !searchPage.includes('resultCount: 1'));
check(
  'ProductCard requires real click context props',
  hasAll(searchPage, ['position: number;', 'resultCount: number;', 'filters: string[];'])
);
check(
  'click payload sends real position/resultCount/filters',
  hasAll(searchPage, ['position,', 'resultCount,', 'filters,', "fetch('/api/search/clicks'"])
);
check(
  'product grid maps products with index',
  searchPage.includes('displayProducts.map((product, index) => (') && searchPage.includes('position={index + 1}')
);
check(
  'resultCount follows server total and protects against a visible page overflow',
  hasAll(searchPage, ['clickTrackingResultCount', 'Math.max(results?.total ?? displayProducts.length', 'displayProducts.length'])
);
check(
  'filter context includes server-side filters only after Phase 28',
  hasAll(searchPage, [
    'activeSearchFilters',
    'category:',
    'brand:',
    'price:',
    'inStock:true',
    'sort:',
  ]) &&
    !hasAll(searchPage, ['localCategory:', 'localBrand:', 'localSort:', 'localPrice:'])
);
check(
  'query context falls back for filter-only search',
  hasAll(searchPage, ['clickTrackingQuery', 'activeSearchFilters[0]', 'filtered-search'])
);
check(
  'backend rejects invalid position/resultCount context',
  hasAll(clickHelper, ['position < 1', 'resultCount < 1', 'position > resultCount'])
);
check(
  'package script exposes qa:search-click-position',
  pkg.scripts?.['qa:search-click-position'] === 'node scripts/search-click-position-audit.mjs'
);
check(
  'package script exposes qa:phase24 alias',
  pkg.scripts?.['qa:phase24'] === 'node scripts/search-click-position-audit.mjs'
);

let failed = 0;
for (const item of checks) {
  if (item.passed) {
    console.log(`PASS: ${item.name}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${item.name}`);
  }
}

if (failed) {
  console.error(`\nSearch click position audit failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nSearch click position audit passed: ${checks.length}/${checks.length} checks passed.`);
