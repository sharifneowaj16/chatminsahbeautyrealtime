#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
const check = (name, passed, details = '') => {
  checks.push({ name, passed, details });
};

function hasAll(text, parts) {
  return parts.every((part) => text.includes(part));
}

const analytics = read('app/api/search/analytics/route.ts');
const metrics = read('app/api/search/metrics/route.ts');
const clicks = read('app/api/search/clicks/route.ts');
const health = read('app/api/search/health/route.ts');
const searchRoute = read('app/api/search/route.ts');
const transformer = read('lib/search/productTransformer.ts');
const esMapping = read('lib/elasticsearch.ts');
const productQueue = read('lib/queue/productQueue.ts');
const searchPage = read('app/(storefront)/search/page.tsx');
const highlightComponent = read('components/search/SearchHighlight.tsx');
const indexingSearch = read('lib/elasticsearch/indexing.ts');

check(
  'GET /api/search/analytics requires admin analytics permission',
  hasAll(analytics, ['requireAdminPermission', 'ADMIN_PERMISSIONS.ANALYTICS_VIEW'])
);
check(
  'GET /api/search/metrics requires admin analytics permission',
  hasAll(metrics, ['requireAdminPermission', 'ADMIN_PERMISSIONS.ANALYTICS_VIEW'])
);
check(
  'GET /api/search/clicks requires admin analytics permission',
  hasAll(clicks, ['export async function GET(request: NextRequest)', 'requireAdminPermission', 'ADMIN_PERMISSIONS.ANALYTICS_VIEW'])
);
check(
  'PUT /api/search/clicks is disabled for client/admin conversion mutation',
  hasAll(clicks, ['export async function PUT()', 'SEARCH_CONVERSION_CLIENT_UPDATE_DISABLED', 'verified order/payment flows']) &&
    !clicks.includes('conversions: { increment: 1 }') &&
    !clicks.includes('revenue: { increment: revenue')
);
check(
  'Public /api/search/health returns minimal ok-only payload by default',
  hasAll(health, ['function publicHealthResponse()', 'ok: true', "request.nextUrl.searchParams.get('details') === 'true'", 'if (!wantsDetailedHealth)'])
);
check(
  'Detailed /api/search/health requires SUPER_ADMIN',
  hasAll(health, ['requireSuperAdmin', 'Detailed search health is restricted to SUPER_ADMIN users'])
);
check(
  'Detailed health keeps ES cluster/index internals behind the guard',
  health.indexOf('if (!wantsDetailedHealth)') < health.indexOf('testConnection()') &&
    health.indexOf('requireSuperAdmin') < health.indexOf('testConnection()')
);
check(
  'Phase 19 regression: category/subcategory/tags do not use .keyword',
  !/category\.keyword|subcategory\.keyword|tags\.keyword/.test(searchRoute)
);
check(
  'Phase 20 regression: ES mapping has visibility fields',
  hasAll(esMapping, ['isActive:', 'deletedAt:', 'status:', 'visibility:'])
);
check(
  'Phase 20 regression: transformer emits active/deleted visibility fields',
  hasAll(transformer, ['isActive:', 'deletedAt:', 'status,', 'visibility,'])
);
check(
  'Phase 20 regression: search route builds active product filters',
  hasAll(searchRoute, ['buildActiveProductESFilters', 'const activeProductFilters = buildActiveProductESFilters()', 'const filter: any[] = [...activeProductFilters]'])
);
check(
  'Phase 21 regression: product queue has index/delete/reindex helpers',
  hasAll(productQueue, ['enqueueProductIndex', 'enqueueProductDelete', 'enqueueProductReindex'])
);

check(
  'Phase 26 regression: search highlight snippets use Elasticsearch HTML encoder',
  /highlight:\s*{[\s\S]*encoder:\s*['"]html['"][\s\S]*pre_tags:\s*\[['"]<mark>['"]\][\s\S]*post_tags:\s*\[['"]<\/mark>['"]\]/.test(searchRoute) &&
    /highlight:\s*{[\s\S]*encoder:\s*['"]html['"]/.test(indexingSearch)
);
check(
  'Phase 26 regression: search page renders highlights without raw HTML injection',
  searchPage.includes("@/components/search/SearchHighlight") &&
    searchPage.includes('<SearchHighlight html={product.highlighted?.name} fallback={product.name} />') &&
    !searchPage.includes('dangerouslySetInnerHTML')
);
check(
  'Phase 26 regression: SearchHighlight component parses only mark/em wrappers',
  hasAll(highlightComponent, [
    'HIGHLIGHT_TAG_PATTERN',
    '<\\/?(?:mark|em)>',
    'decodeHighlightEntities',
    '<mark key={key}>{text}</mark>',
    '<em key={key}>{text}</em>',
  ]) &&
    !highlightComponent.includes('dangerouslySetInnerHTML') &&
    !highlightComponent.includes('__html') &&
    !highlightComponent.includes('innerHTML')
);

let failed = 0;
for (const item of checks) {
  if (item.passed) {
    console.log(`PASS: ${item.name}`);
  } else {
    failed += 1;
    console.error(`FAIL: ${item.name}${item.details ? ` — ${item.details}` : ''}`);
  }
}

if (failed > 0) {
  console.error(`\nSearch security audit failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nSearch security audit passed: ${checks.length}/${checks.length} checks passed.`);
