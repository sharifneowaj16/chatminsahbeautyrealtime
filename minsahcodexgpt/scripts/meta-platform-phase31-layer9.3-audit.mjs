#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const tests = read('tests/meta-v6/phase31-layer9.3-persistence-idempotency.test.mjs');
const dbGate = read('scripts/phase31-layer9.3-db-gate.sh');
const dbDrill = read('scripts/phase31-layer3-db-drill.sh');

assert.equal(pkg.scripts['test:meta-v6-phase31-layer9.3'], 'node --experimental-strip-types --test tests/meta-v6/phase31-layer9.3-persistence-idempotency.test.mjs');
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.3'], 'node scripts/meta-platform-phase31-layer9.3-audit.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.3-source'], 'npm run test:meta-v6-phase31-layer9.3 && npm run qa:meta-platform-phase31-layer9.3 && npm run qa:phase31-meta-persistence');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.3-db'], 'bash scripts/phase31-layer9.3-db-gate.sh');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.3'], 'npm run qa:phase31-meta-layer9.3-source && npm run qa:phase31-meta-layer9.3-db');
assert.match(execution.current_item, /^9\.[3-8]$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.3')?.schema_change_expected, false);

for (const phrase of [
  'canonical receipt duplicate', 'process crash lease', 'invalid terminal-state transitions', 'controlled dead-letter replay',
  'normalized Lead replay', 'inbound Instagram message and outbound key', 'safe metadata projection',
  'DB uniqueness boundaries', 'database drill is fail-closed',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const phrase of ['psql is not installed', 'PHASE31_LAYER3_CONFIRM_DISPOSABLE=YES', 'No live PostgreSQL', 'phase31-layer3-db-drill.sh']) {
  assert.match(dbGate, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
for (const phrase of ['APPLY PASS', 'RECOVERY PASS', 'REAPPLY PASS', 'run_concurrency_drill "initial"', 'run_concurrency_drill "reapply"']) {
  assert.match(dbDrill, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);
console.log('Phase 31 Layer 9.3 persistence/idempotency static audit: PASS');
console.log('- receipt, Lead and Instagram idempotency regression scenarios: covered');
console.log('- lease reclaim, stale-worker fencing and invalid transitions: covered');
console.log('- replay audit and sensitive-data redaction: covered');
console.log('- disposable PostgreSQL gate: explicit and fail-closed');
console.log('- Prisma schema change: NONE');
