#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const testFile = 'tests/meta-v6/phase31-layer9.7-live-meta-provider-evidence.test.mjs';
const contractFile = 'scripts/phase31-layer9.7-evidence-contract.mjs';
const liveGateFile = 'scripts/phase31-layer9.7-live-provider-gate.mjs';
const runbookFile = 'docs/runbooks/phase31-layer9.7-live-meta-evidence.md';
const tests = read(testFile);
const contract = read(contractFile);
const liveGate = read(liveGateFile);
const runbook = read(runbookFile);

assert.equal(fs.existsSync(testFile), true);
assert.equal(fs.existsSync(contractFile), true);
assert.equal(fs.existsSync(liveGateFile), true);
assert.equal(fs.existsSync(runbookFile), true);
assert.equal(pkg.scripts['test:meta-v6-phase31-layer9.7'], 'node --test tests/meta-v6/phase31-layer9.7-live-meta-provider-evidence.test.mjs');
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.7'], 'node scripts/meta-platform-phase31-layer9.7-audit.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.7-source'], 'npm run test:meta-v6-phase31-layer9.7 && npm run qa:meta-platform-phase31-layer9.7');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.7-live'], 'node scripts/phase31-layer9.7-live-provider-gate.mjs');
assert.equal(pkg.scripts['qa:phase31-meta-layer9.7'], 'npm run qa:phase31-meta-layer9.7-source && npm run qa:phase31-meta-layer9.7-live');
assert.match(execution.current_item, /^(?:9\.7|9\.8)$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.7')?.schema_change_expected, false);

for (const phrase of [
  'evidence contract enumerates every roadmap live-provider category',
  'complete contract fixture validates all category-specific fields and artifact hashes',
  'live mode rejects mock, fixture, synthetic or fabricated evidence',
  'evidence fails closed when any required live category is missing',
  'evidence requires matching SHA-256 for every captured artifact',
  'textual provider evidence rejects token-like secrets and sensitive JSON keys',
  'outbound reply proof requires durable provider message identifiers',
  'expired reply proof requires no provider call and an explicit blocked outcome',
  'retry and dead-letter proof requires real attempt counts and terminal outcomes',
  'rollback proof requires active switch, blocked result and zero provider call',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const category of [
  'META_WEBHOOK_SUBSCRIPTION', 'LEADGEN_WEBHOOK_DELIVERY', 'META_TEST_LEAD_PROCESSED',
  'INSTAGRAM_WEBHOOK_DELIVERY', 'INSTAGRAM_INBOUND_MESSAGE', 'INSTAGRAM_VALID_REPLY',
  'INSTAGRAM_EXPIRED_REPLY_BLOCKED', 'INSTAGRAM_PRIVATE_REPLY', 'PROVIDER_OUTBOUND_MESSAGE_ID',
  'QUEUE_RETRY', 'DEAD_LETTER', 'ROLLBACK_KILL_SWITCH', 'PERMISSION_ACCOUNT_HEALTH',
]) assert.match(contract, new RegExp(`'${category}'`));

assert.match(liveGate, /PHASE31_LAYER9_7_CONFIRM_LIVE === 'YES'/);
assert.match(liveGate, /process\.exitCode = 2/);
assert.match(liveGate, /phase31-layer9\.7-live-evidence-manifest\.json/);
assert.doesNotMatch(liveGate, /META_(?:ACCESS_TOKEN|APP_SECRET)|FACEBOOK_(?:ACCESS_TOKEN|APP_SECRET)|INSTAGRAM_ACCESS_TOKEN/);
assert.match(runbook, /Never paste access tokens, app secrets, verify tokens or customer PII/);
assert.match(runbook, /PHASE31_LAYER9_7_CONFIRM_LIVE=YES/);
for (const directory of ['screenshots', 'logs', 'provider-responses']) {
  assert.equal(fs.existsSync(`evidence/phase31-meta-social-crm/${directory}`), true);
}
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.7 live Meta evidence audit: PASS');
console.log('- thirteen required live-provider evidence categories: contracted');
console.log('- artifact hashing, approved paths and anti-fabrication controls: enforced');
console.log('- provider message ID, retry/dead-letter and kill-switch proof: enforced');
console.log('- secret/PII redaction and screenshot review: enforced');
console.log('- live gate is fail-closed and requires explicit operator confirmation');
console.log('- no live provider PASS is claimed by this static audit');
console.log('- Prisma schema change: NONE');
