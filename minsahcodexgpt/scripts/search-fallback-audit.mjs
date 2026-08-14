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

const routePath = 'app/api/search/route.ts';
const fallbackPath = 'lib/search/db-fallback.ts';
const healthPath = 'app/api/search/health/route.ts';
const adminPagePath = 'app/admin/search-health/page.tsx';
const pkgPath = 'package.json';

const route = exists(routePath) ? read(routePath) : '';
const fallback = exists(fallbackPath) ? read(fallbackPath) : '';
const health = exists(healthPath) ? read(healthPath) : '';
const adminPage = exists(adminPagePath) ? read(adminPagePath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

check('Database fallback helper exists', exists(fallbackPath), fallbackPath);
check('Search route imports database fallback', /executeDatabaseSearchFallback/.test(route), routePath);
check('Elasticsearch success response declares source elasticsearch', /source:\s*['"]elasticsearch['"]/.test(route), routePath);
check('Fallback response declares source database_fallback', /source:\s*['"]database_fallback['"]/.test(fallback), fallbackPath);
check('Search route returns DB fallback when ES search throws', /attempting database fallback/.test(route) && /executeDatabaseSearchFallback\(/.test(route), routePath);
check('Fallback response header marks DB fallback mode', /X-Elasticsearch-Fallback/.test(route) && /X-Search-Source['"]?\s*:\s*['"]database_fallback['"]/.test(route), routePath);
check('Fallback only exposes active non-deleted products', /ACTIVE_PRODUCT_PRISMA_WHERE/.test(fallback) && /isActive/.test(fallback) && /deletedAt/.test(fallback), fallbackPath);
check('Fallback supports core search filters', /category/.test(fallback) && /brand/.test(fallback) && /minPrice/.test(fallback) && /maxPrice/.test(fallback) && /inStock/.test(fallback), fallbackPath);
check('Fallback supports DB pagination and sorting', /skip/.test(fallback) && /take:\s*limit/.test(fallback) && /buildOrderBy/.test(fallback), fallbackPath);
check('Detailed health includes database fallback status', /getDatabaseFallbackHealth/.test(health) && /databaseFallback/.test(health), healthPath);
check('Detailed health reports degraded DB fallback source', /status\s*=\s*elasticsearchReady \? ['"]healthy['"] : fallbackReady \? ['"]degraded['"]/.test(health) && /database_fallback/.test(health), healthPath);
check('Public health remains minimal', /publicHealthResponse/.test(health) && /wantsDetailedHealth/.test(health), healthPath);
check('Admin search health dashboard exists', exists(adminPagePath), adminPagePath);
check('Admin dashboard shows degraded fallback alert', /Elasticsearch down/.test(adminPage) && /search using DB fallback/.test(adminPage), adminPagePath);
check('Search UI can show DB fallback badge', /DB fallback/.test(route + adminPage + (exists('app/(storefront)/search/page.tsx') ? read('app/(storefront)/search/page.tsx') : '')), 'app/(storefront)/search/page.tsx');
check('package.json has qa:search-fallback', pkg.scripts?.['qa:search-fallback'] === 'node scripts/search-fallback-audit.mjs', pkgPath);
check('package.json has qa:phase27 alias', pkg.scripts?.['qa:phase27'] === 'node scripts/search-fallback-audit.mjs', pkgPath);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nPhase 27 audit: ${checks.length - failed.length}/${checks.length} checks passed`);

if (failed.length > 0) {
  process.exitCode = 1;
}
