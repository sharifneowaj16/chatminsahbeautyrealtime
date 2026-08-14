#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const file = (relativePath) => path.join(root, relativePath);
const exists = (relativePath) => fs.existsSync(file(relativePath));
const read = (relativePath) => exists(relativePath) ? fs.readFileSync(file(relativePath), 'utf8') : '';

const checks = [];
const childAudits = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}
function hasAll(text, parts) {
  return parts.every((part) => text.includes(part));
}
function runAudit(relativePath) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [file(relativePath)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  childAudits.push({
    script: relativePath,
    pass: result.status === 0,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    outputTail: output.slice(-2200),
  });
  check(`${relativePath} passes`, result.status === 0, result.status === 0 ? '' : output.slice(-2200));
}

const packageJson = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
const scripts = packageJson.scripts ?? {};
const ci = read('.github/workflows/ci.yml');
const qaDoc = read('docs/production/search-qa.md');

const expectedAudits = [
  'scripts/search-filter-audit.mjs',
  'scripts/search-index-sync-audit.mjs',
  'scripts/search-security-audit.mjs',
  'scripts/search-click-integrity-audit.mjs',
  'scripts/search-click-position-audit.mjs',
  'scripts/search-trending-suggestions-audit.mjs',
  'scripts/search-highlight-xss-audit.mjs',
  'scripts/search-fallback-audit.mjs',
  'scripts/search-ui-contract-audit.mjs',
];

for (const audit of expectedAudits) {
  check(`Search audit script exists: ${audit}`, exists(audit), audit);
}

check('package.json exposes qa:search master command', scripts['qa:search'] === 'node scripts/master-search-regression-audit.mjs', 'qa:search');
check('package.json exposes qa:phase29 alias', scripts['qa:phase29'] === 'node scripts/master-search-regression-audit.mjs', 'qa:phase29');
check('package.json exposes qa:search-filter', scripts['qa:search-filter'] === 'node scripts/search-filter-audit.mjs', 'qa:search-filter');
check('package.json exposes qa:search-index', scripts['qa:search-index'] === 'node scripts/search-index-sync-audit.mjs', 'qa:search-index');
check('package.json keeps qa:search-security', scripts['qa:search-security'] === 'node scripts/search-security-audit.mjs', 'qa:search-security');
check('package.json keeps Phase 21/24/25/26/27/28 aliases',
  scripts['qa:phase21'] === 'node scripts/search-index-sync-audit.mjs' &&
  scripts['qa:phase24'] === 'node scripts/search-click-position-audit.mjs' &&
  scripts['qa:phase25'] === 'node scripts/search-trending-suggestions-audit.mjs' &&
  scripts['qa:phase26'] === 'node scripts/search-highlight-xss-audit.mjs' &&
  scripts['qa:phase27'] === 'node scripts/search-fallback-audit.mjs' &&
  scripts['qa:phase28'] === 'node scripts/search-ui-contract-audit.mjs'
);

check('qa:predeploy includes master search regression gate', String(scripts['qa:predeploy'] || '').includes('npm run qa:search'), 'qa:predeploy');
check('qa:predeploy still includes audit:security and qa:phase17',
  String(scripts['qa:predeploy'] || '').includes('npm run audit:security') &&
    String(scripts['qa:predeploy'] || '').includes('npm run qa:phase17'),
  'qa:predeploy'
);

check('CI workflow has Search QA job', /search-qa:/.test(ci) && /name:\s*Search QA/.test(ci), '.github/workflows/ci.yml');
check('CI Search QA runs qa:search, qa:phase17, and audit:security', hasAll(ci, [
  'npm run qa:search',
  'npm run qa:phase17',
  'npm run audit:security',
]), '.github/workflows/ci.yml');
check('Build job depends on Search QA gate', /needs:\s*\[[^\]]*search-qa[^\]]*\]/.test(ci), '.github/workflows/ci.yml');

check('Search QA production doc exists', exists('docs/production/search-qa.md'), 'docs/production/search-qa.md');
check('Search QA doc covers required commands and evidence path', hasAll(qaDoc, [
  'npm run qa:search',
  'npm run qa:search-security',
  'npm run qa:search-index',
  'npm run qa:phase17',
  'docs/production/search-verification-evidence/',
]), 'docs/production/search-qa.md');

// Run children last so command-surface failures remain visible at the top.
for (const audit of expectedAudits) {
  if (exists(audit)) runAudit(audit);
}

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log('\nChild audit summary:');
for (const audit of childAudits) {
  console.log(`${audit.pass ? '✅' : '❌'} ${audit.script} (${audit.durationMs}ms, exit ${audit.exitCode})`);
  if (!audit.pass && audit.outputTail) {
    console.error(audit.outputTail);
  }
}

console.log(`\nMaster search regression audit: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;
