#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  PHASE31_EXCLUDED_LIVE_SCOPES,
  PHASE31_STATIC_AUDIT_SUITE_ORDER,
  PHASE31_STATIC_AUDIT_SUITES,
} from './meta-v6-phase31-audit-contract.mjs';
import { validatePhase31StaticAuditContract } from './meta-v6-phase31-audit-runner.mjs';

const read = (path) => fs.readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const pkg = json('package.json');
const expectedWrappers = {
  'qa:phase31-meta-webhooks': 'node scripts/meta-v6-phase31-webhook-audit.mjs',
  'qa:phase31-meta-persistence': 'node scripts/meta-v6-phase31-persistence-audit.mjs',
  'qa:phase31-meta-leads': 'node scripts/meta-v6-phase31-leads-audit.mjs',
  'qa:phase31-meta-instagram': 'node scripts/meta-v6-phase31-instagram-audit.mjs',
  'qa:phase31-meta-realtime': 'node scripts/meta-v6-phase31-realtime-audit.mjs',
  'qa:phase31-meta-admin': 'node scripts/meta-v6-phase31-admin-audit.mjs',
  'qa:phase31-meta-cutover': 'node scripts/meta-v6-phase31-cutover-audit.mjs',
};

assert.deepEqual(Object.keys(PHASE31_STATIC_AUDIT_SUITES), PHASE31_STATIC_AUDIT_SUITE_ORDER);
assert.deepEqual(validatePhase31StaticAuditContract(pkg.scripts), []);
for (const [name, value] of Object.entries(expectedWrappers)) assert.equal(pkg.scripts[name], value, name);
assert.equal(
  pkg.scripts['qa:phase31-meta-social-crm'],
  'npm run qa:phase31-meta-webhooks && npm run qa:phase31-meta-persistence && npm run qa:phase31-meta-leads && npm run qa:phase31-meta-instagram && npm run qa:phase31-meta-realtime && npm run qa:phase31-meta-admin && npm run qa:phase31-meta-cutover',
);
assert.equal(PHASE31_EXCLUDED_LIVE_SCOPES.includes('LIVE_META_PROVIDER'), true);
assert.equal(PHASE31_EXCLUDED_LIVE_SCOPES.includes('LIVE_POSTGRESQL'), true);
assert.equal(PHASE31_EXCLUDED_LIVE_SCOPES.includes('LIVE_REDIS_BULLMQ'), true);
for (const path of Object.values(expectedWrappers).map((value) => value.replace(/^node /, ''))) {
  assert.equal(fs.existsSync(path), true, path);
  assert.match(read(path), /runPhase31StaticAuditCli/);
}
const execution = json('.ai/phase31-execution-manifest.json');
assert.match(execution.current_item, /^9\.[1-8]$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.1')?.schema_change_expected, false);
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.1 automated audit script audit: PASS');
console.log(`- canonical static suites: ${PHASE31_STATIC_AUDIT_SUITE_ORDER.length}/${PHASE31_STATIC_AUDIT_SUITE_ORDER.length}`);
console.log(`- registered leaf commands: ${Object.values(PHASE31_STATIC_AUDIT_SUITES).reduce((sum, suite) => sum + suite.commands.length, 0)}`);
console.log('- deterministic manifest/list mode: enforced by focused tests');
console.log('- static child environment strips secret-bearing variables');
console.log('- live Meta/PostgreSQL/Redis/build evidence remains outside 9.1');
console.log('- Prisma schema change: NONE');
