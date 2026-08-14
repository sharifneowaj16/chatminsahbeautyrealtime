#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
function check(name, file, matcher) {
  const content = read(file);
  const ok = typeof matcher === 'function' ? matcher(content) : matcher.test(content);
  checks.push({ name, file, ok });
}

check('trending helper exports trackSearchQuery', 'lib/elasticsearch/trending.ts', /export\s+async\s+function\s+trackSearchQuery/);
check('trending helper exports trackProductView', 'lib/elasticsearch/trending.ts', /export\s+async\s+function\s+trackProductView/);
check('trending helper exports trackSearchClick', 'lib/elasticsearch/trending.ts', /export\s+async\s+function\s+trackSearchClick/);
check('trending helper exports getTrendingQueries', 'lib/elasticsearch/trending.ts', /export\s+async\s+function\s+getTrendingQueries/);
check('trending helper exports getTrendingProducts', 'lib/elasticsearch/trending.ts', /export\s+async\s+function\s+getTrendingProducts/);
check('trending helper tracks zero-result queries', 'lib/elasticsearch/trending.ts', /export\s+async\s+function\s+trackZeroResultQuery/);
check('trending helper uses Redis sorted sets', 'lib/elasticsearch/trending.ts', (content) => /redis\.zincrby/.test(content) && /redis\.zrevrange/.test(content));
check('search route persists search queries', 'app/api/search/route.ts', (content) => /trackSearchQuery\(query\)/.test(content) && /trackQueryImpression\(query\)/.test(content));
check('search route persists zero-result queries', 'app/api/search/route.ts', (content) => /totalHits\s*===\s*0\s*\?\s*trackZeroResultQuery\(query\)/.test(content) && /trackFailedQuery\(query\)/.test(content));
check('click tracking persists validated click intelligence', 'lib/search/click-tracking.ts', (content) => /trackSearchClick\(input\.click\.query, input\.click\.productId\)/.test(content) && /trackQueryClick\(input\.click\.query\)/.test(content));
check('suggestions use Redis trending queries', 'app/api/search/suggestions/route.ts', (content) => /getTrendingQueries/.test(content) && /getMatchingTrendingQueries/.test(content));
check('suggestions include trending products', 'app/api/search/suggestions/route.ts', (content) => /fetchTrendingProductSuggestions/.test(content) && /getTrendingProductIds/.test(content));
check('suggestions include synonym expansion', 'app/api/search/suggestions/route.ts', (content) => /SYNONYM_EXPANSIONS/.test(content) && /source:\s*'synonym_expansion'/.test(content));
check('suggestions include zero-result fallback', 'app/api/search/suggestions/route.ts', (content) => /getZeroResultQueries/.test(content) && /zero_result_fallback/.test(content));
check('suggestions keep active product filter', 'app/api/search/suggestions/route.ts', (content) => /isActiveSearchHit/.test(content) && /buildActiveProductESFilters/.test(content));
check('trending route returns Redis persistent source', 'app/api/search/trending/route.ts', /source:\s*'redis_persistent_trending'/);
check('package exposes qa phase25 script', 'package.json', /"qa:phase25"\s*:\s*"node scripts\/search-trending-suggestions-audit\.mjs"/);

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}: ${item.name} (${item.file})`);
}

if (failed.length > 0) {
  console.error(`\nSearch trending/suggestions audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nSearch trending/suggestions audit passed: ${checks.length}/${checks.length} checks passed.`);
