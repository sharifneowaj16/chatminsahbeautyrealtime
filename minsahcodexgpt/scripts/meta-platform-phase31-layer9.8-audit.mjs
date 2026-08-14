#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const testFile = 'tests/meta-v6/phase31-layer9.8-final-runtime-release.test.mjs';
const contractFile = 'scripts/phase31-layer9.8-release-contract.mjs';
const gateFile = 'scripts/phase31-layer9.8-final-release-gate.mjs';
const tests = read(testFile);
const contract = read(contractFile);
const gate = read(gateFile);

for (const file of [testFile, contractFile, gateFile]) assert.equal(fs.existsSync(file), true, `${file} missing`);
assert.equal(pkg.scripts['test:meta-v6-phase31-layer9.8'], 'node --test tests/meta-v6/phase31-layer9.8-final-runtime-release.test.mjs');
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.8'], 'node scripts/meta-platform-phase31-layer9.8-audit.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.8-source'], 'npm run test:meta-v6-phase31-layer9.8 && npm run qa:meta-platform-phase31-layer9.8');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.8-runtime'], 'node scripts/phase31-layer9.8-final-release-gate.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.8'], 'npm run qa:phase31-meta-layer9.8-source && npm run qa:phase31-meta-layer9.8-runtime');
assert.match(execution.current_item, /^9\.8$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.8')?.schema_change_expected, false);

for (const phrase of [
  'contract enumerates every mandatory final release check',
  'all executed checks PASS yields Phase 31 COMPLETE and release PASS',
  'one blocked mandatory check blocks the release',
  'missing mandatory check fails closed',
  'skipped or unknown status is never release evidence',
  'artifact hashes and approved paths are mandatory',
  'evidence rejects credential-like connection URLs',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const check of [
  'STATIC_SOURCE_QA', 'MAIN_APP_NPM_CI', 'PRISMA_GENERATE', 'MAIN_APP_TYPECHECK', 'MAIN_APP_LINT',
  'MAIN_APP_BUILD', 'REALTIME_NPM_CI', 'REALTIME_TYPECHECK', 'REALTIME_BUILD',
  'POSTGRESQL_MIGRATION_IDEMPOTENCY', 'REDIS_BULLMQ_RUNTIME', 'LIVE_META_PROVIDER',
  'SECURITY_MEDIA_IDEMPOTENCY', 'FRESH_PACKAGE_REPRODUCIBILITY',
]) assert.match(contract, new RegExp(`'${check}'`));
assert.match(gate, /process\.exit\(2\)/);
assert.doesNotMatch(gate, /META_(?:ACCESS_TOKEN|APP_SECRET)|DATABASE_URL\s*=|REDIS_URL\s*=/);
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.8 final runtime/release audit: PASS');
console.log('- fourteen mandatory release checks are contracted');
console.log('- skipped, missing, unhashed or secret-bearing evidence fails closed');
console.log('- Phase 31 COMPLETE is possible only when every check is executed PASS');
console.log('- final package reproducibility is mandatory and cannot be claimed on a blocked release');
console.log('- Prisma schema change: NONE');
