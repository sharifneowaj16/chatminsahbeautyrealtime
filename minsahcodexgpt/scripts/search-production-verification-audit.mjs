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

const evidenceDir = 'docs/production/search-verification-evidence';
const requiredEvidenceFiles = [
  'README.md',
  'search-filter-proof.md',
  'search-index-sync-proof.md',
  'search-security-proof.md',
  'search-click-integrity-proof.md',
  'search-fallback-proof.md',
  'search-suggestion-proof.md',
  'search-ui-proof.md',
];
const proofFiles = requiredEvidenceFiles.filter((name) => name !== 'README.md');
const packageJson = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
const scripts = packageJson.scripts ?? {};
const searchQaDoc = read('docs/production/search-qa.md');
const readme = read(`${evidenceDir}/README.md`);
const smokeScript = read('scripts/search-production-smoke.mjs');

check('Phase 30 evidence directory exists', exists(evidenceDir), evidenceDir);

for (const name of requiredEvidenceFiles) {
  check(`Phase 30 evidence file exists: ${name}`, exists(`${evidenceDir}/${name}`), `${evidenceDir}/${name}`);
}

check('Evidence README lists all required proof files', hasAll(readme, proofFiles), `${evidenceDir}/README.md`);
check('Evidence README keeps live production status explicit', /PENDING LIVE PRODUCTION EXECUTION/.test(readme) && /Do not mark search 10\/10 production verified/i.test(readme), `${evidenceDir}/README.md`);
check('Evidence README lists final required commands', hasAll(readme, [
  'npm run qa:search',
  'npm run qa:phase17',
  'npm run audit:security',
  'npm run typecheck',
  'npm run build',
]), `${evidenceDir}/README.md`);

const commonRequiredSections = [
  '## Status',
  'Production URL',
  'Verification date/time',
  'Tester',
  'Git commit / deploy version',
  '## Automated command evidence',
  '## Manual production checks',
  'Expected Result',
  'Actual Result',
  'Pass/Fail',
  '## Result',
  '## Notes / defects',
];

for (const name of proofFiles) {
  const text = read(`${evidenceDir}/${name}`);
  check(`${name} contains required manual evidence sections`, hasAll(text, commonRequiredSections), `${evidenceDir}/${name}`);
  check(`${name} remains clearly unexecuted until live verification`, /PENDING LIVE PRODUCTION EXECUTION/.test(text), `${evidenceDir}/${name}`);
}

const fileSpecificExpectations = {
  'search-filter-proof.md': ['Search by product name', 'Bangla/English synonym', 'Typo/fuzzy search', 'Category filter', 'Subcategory filter', 'Tags filter', 'Brand filter', 'Price filter', 'Sort by popularity'],
  'search-index-sync-proof.md': ['Create product indexes to ES', 'Update product name reindexes', 'Update price updates sort/facet', 'Soft delete removes from search', 'Worker retry works'],
  'search-security-proof.md': ['Public analytics blocked', 'Public health minimal', 'Admin health detailed', 'Highlight XSS safe'],
  'search-click-integrity-proof.md': ['Invalid productId click rejected', 'Inactive product click rejected', 'Repeated click deduped', 'Rate limit works', 'Verified order conversion updates analytics', 'Click position stored correctly'],
  'search-fallback-proof.md': ['ES healthy source', 'ES down fallback', 'Fallback active products only', 'Health degraded state', 'Recovery to ES'],
  'search-suggestion-proof.md': ['Autocomplete product suggestion', 'Popular query suggestion', 'Trending product suggestion', 'Synonym expansion', 'Zero-result fallback', 'Trending survives restart', 'Multi-instance safe storage'],
  'search-ui-proof.md': ['Filter updates URL', 'API receives filter', 'Product grid reflects API response', 'Facet count matches filtered result', 'Pagination keeps filter', 'Sort applies to full result set', 'Shareable URL restores state'],
};

for (const [name, expectations] of Object.entries(fileSpecificExpectations)) {
  check(`${name} covers plan-required manual checks`, hasAll(read(`${evidenceDir}/${name}`), expectations), `${evidenceDir}/${name}`);
}

check('Production smoke script exists', exists('scripts/search-production-smoke.mjs'), 'scripts/search-production-smoke.mjs');
check('Production smoke script requires explicit production base URL', /SEARCH_PRODUCTION_BASE_URL/.test(smokeScript) && /process\.exitCode = 2/.test(smokeScript), 'scripts/search-production-smoke.mjs');
check('Production smoke script covers read-only search, suggestions, health, and public admin-block checks', hasAll(smokeScript, [
  '/api/search?',
  '/api/search/suggestions?',
  '/api/search/health',
  '/api/search/analytics',
  '/api/search/metrics',
  '/api/search/clicks',
]), 'scripts/search-production-smoke.mjs');
check('Production smoke script does not perform write/click tracking by default', /SEARCH_VERIFY_WRITE_CLICKS/.test(smokeScript) && /Write click smoke disabled by default/.test(smokeScript), 'scripts/search-production-smoke.mjs');

check('package.json exposes qa:search-production-verification', scripts['qa:search-production-verification'] === 'node scripts/search-production-verification-audit.mjs', 'package.json');
check('package.json exposes qa:phase30 alias', scripts['qa:phase30'] === 'node scripts/search-production-verification-audit.mjs', 'package.json');
check('package.json exposes search:production-smoke', scripts['search:production-smoke'] === 'node scripts/search-production-smoke.mjs', 'package.json');

check('Search QA doc references Phase 30 evidence and smoke commands', hasAll(searchQaDoc, [
  'npm run qa:phase30',
  'npm run search:production-smoke',
  'SEARCH_PRODUCTION_BASE_URL',
  'docs/production/search-verification-evidence/',
]), 'docs/production/search-qa.md');

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nPhase 30 production verification evidence audit: ${checks.length - failed.length}/${checks.length} checks passed`);
console.log('Note: this audit validates the Phase 30 evidence pack and runbook structure. It does not replace live manual production verification.');

if (failed.length > 0) process.exitCode = 1;
