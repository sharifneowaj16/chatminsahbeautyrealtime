#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const exists = (path) => fs.existsSync(path);
const itemIds = ['8.1', '8.2', '8.3', '8.4', '8.5', '8.6'];
const requiredFlags = [
  'META_PLATFORM_LEADS',
  'META_PLATFORM_INSTAGRAM',
  'META_PLATFORM_LEGACY_FACEBOOK',
  'META_PLATFORM_SOCIAL_REALTIME',
  'META_PLATFORM_SOCIAL_WEBHOOKS',
];
const optionalFlags = [
  'META_PLATFORM_INSTAGRAM_WRITES',
  'META_PLATFORM_INSTAGRAM_PRIVATE_REPLY',
  'META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS',
  'META_PLATFORM_SOCIAL_REPLAY',
];

for (const id of itemIds) {
  const result = `evidence/phase31-meta-social-crm/items/phase31_layer${id}_result.md`;
  const log = `evidence/phase31-meta-social-crm/logs/phase31_layer${id}_gate.log`;
  assert.equal(exists(result), true, result);
  assert.equal(exists(log), true, log);
  const text = read(log);
  assert.match(text, /PASS|# pass [1-9]/, log);
  assert.doesNotMatch(text, /# fail [1-9]|^not ok|npm ERR!|===== FAIL:/im, log);
}

const flags = json('config/meta-phase31-cutover-flags.json');
assert.deepEqual(flags.flags.filter((entry) => entry.tier === 'required').map((entry) => entry.name), requiredFlags);
assert.deepEqual(flags.flags.filter((entry) => entry.tier === 'optional').map((entry) => entry.name), optionalFlags);
for (const entry of flags.flags) {
  const safe = entry.name === 'META_PLATFORM_LEGACY_FACEBOOK';
  assert.equal(entry.defaultValue, safe, entry.name);
  assert.equal(entry.productionDefault, safe, entry.name);
  assert.equal(entry.failSafeValue, safe, entry.name);
}

const standard = read('lib/meta-platform/domains/instagram/standard-reply-runtime.ts');
const privateReply = read('lib/meta-platform/domains/instagram/private-reply-runtime.ts');
const facebookClient = read('realtime-service/src/facebook/graph.client.ts');
const facebookRetry = read('realtime-service/src/facebook/outgoing-retry.ts');
assert.match(standard, /assertInstagramCutoverWriteAuthority\('STANDARD', process\.env\)/);
assert.match(standard, /assertInstagramReplyWriteEnabledAtExecution\('MESSAGE', process\.env\)/);
assert.match(privateReply, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
assert.match(privateReply, /assertInstagramReplyWriteEnabledAtExecution\('PRIVATE_REPLY', process\.env\)/);
assert.match(facebookClient, /assertFacebookOutboundWriteEnabled/);
assert.match(facebookRetry, /getFacebookOutboundWriteControl/);
assert.match(facebookRetry, /deferOutgoingRetryWhileBlocked/);

const lead = json('config/meta-phase31-lead-cutover.json');
const instagram = json('config/meta-phase31-instagram-cutover.json');
const facebook = json('config/meta-phase31-facebook-realtime-cutover.json');
const rollback = json('config/meta-phase31-rollback-proof.json');
assert.equal(lead.stabilityCriteria.maximumDuplicateHandoffs, 0);
assert.equal(instagram.stabilityCriteria.maximumDuplicateMessages, 0);
assert.equal(instagram.stabilityCriteria.maximumDuplicateProviderWrites, 0);
assert.equal(facebook.stabilityCriteria.maximumDuplicateEvents, 0);
assert.equal(facebook.stabilityCriteria.maximumParallelRetryOwners, 0);
assert.equal(rollback.requiredScenarios.length, 9);
assert.equal(rollback.duplicateCounters.length, 4);

const evidence = read('evidence/phase31-meta-social-crm/10-cutover-rollback.md');
const result = read('evidence/phase31-meta-social-crm/items/phase31_layer8.7_result.md');
assert.match(evidence, /PASS — source\/offline cutover gate/);
assert.match(evidence, /Layer 9/);
assert.match(evidence, /No direct provider-write bypass remains/i);
assert.match(result, /Status: PASS/);
assert.doesNotMatch(evidence, /access[_ -]?token\s*[:=]\s*[^`\s]+/i);
assert.doesNotMatch(evidence, /@[a-z0-9.-]+\.[a-z]{2,}/i);

const pkg = json('package.json');
assert.equal(typeof pkg.scripts['qa:phase31-meta-layer8-items'], 'string');
assert.equal(typeof pkg.scripts['qa:phase31-meta-layer8'], 'string');
const execution = json('.ai/phase31-execution-manifest.json');
const currentItem = Number.parseFloat(String(execution.current_item ?? '0'));
assert.ok(execution.current_item === '8.7' || currentItem >= 9.1, `current item ${execution.current_item}`);
if (currentItem >= 9.1) {
  assert.equal(execution.layers['8'].status, 'COMPLETE');
  assert.equal(execution.layers['9'].status, 'IN_PROGRESS');
}
assert.equal(execution.standard_item_contract.no_item_zip, true);
assert.equal(execution.standard_item_contract.full_layer_zip_only, true);
const item = execution.layers['8'].items.find((entry) => entry.id === '8.7');
assert.ok(item);
assert.match(item.status, /^(?:NOT_STARTED|COMPLETE)$/);

const schemaHash = crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex');
assert.equal(schemaHash, 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');

console.log('Phase 31 Layer 8.7 audit PASS');
console.log('- All Layer 8.1-8.6 evidence and prior gates are green');
console.log('- Required/optional flags and production-safe defaults are complete');
console.log('- Instagram and Facebook provider writes retain execution-time controls');
console.log('- Cutover contracts enforce zero duplicates, singular retry ownership and rollback');
console.log('- No direct provider-write bypass remains in audited production paths');
console.log('- Prisma schema change: NONE');
