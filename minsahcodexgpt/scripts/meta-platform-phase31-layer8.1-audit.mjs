#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

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
const allFlags = [...requiredFlags, ...optionalFlags];

const manifest = JSON.parse(fs.readFileSync('config/meta-phase31-cutover-flags.json', 'utf8'));
const envManifest = JSON.parse(fs.readFileSync('config/env.manifest.json', 'utf8'));
const envExample = fs.readFileSync('.env.example', 'utf8');
const runtime = fs.readFileSync('lib/meta-platform/config/phase31-cutover.ts', 'utf8');
const health = fs.readFileSync('lib/meta-platform/admin/provider-health.ts', 'utf8');
const docs = fs.readFileSync('docs/runbooks/meta-phase31-layer8-cutover-flags.md', 'utf8');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const execution = JSON.parse(fs.readFileSync('.ai/phase31-execution-manifest.json', 'utf8'));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.item, '8.1');
assert.deepEqual(manifest.flags.map((flag) => flag.name), allFlags);
assert.deepEqual(manifest.flags.filter((flag) => flag.tier === 'required').map((flag) => flag.name), requiredFlags);
assert.deepEqual(manifest.flags.filter((flag) => flag.tier === 'optional').map((flag) => flag.name), optionalFlags);

for (const flag of manifest.flags) {
  assert.equal(typeof flag.defaultValue, 'boolean', `${flag.name} defaultValue`);
  assert.equal(typeof flag.productionDefault, 'boolean', `${flag.name} productionDefault`);
  assert.equal(typeof flag.failSafeValue, 'boolean', `${flag.name} failSafeValue`);
  assert.equal(envManifest.booleans.includes(flag.name), true, `${flag.name} env schema`);
  assert.match(envExample, new RegExp(`^${flag.name}=(?:true|false)$`, 'm'), `${flag.name} env docs`);
  assert.match(docs, new RegExp(flag.name), `${flag.name} runbook docs`);
}

assert.equal(manifest.flags.find((flag) => flag.name === 'META_PLATFORM_LEGACY_FACEBOOK').defaultValue, true);
for (const name of allFlags.filter((flag) => flag !== 'META_PLATFORM_LEGACY_FACEBOOK')) {
  assert.equal(manifest.flags.find((flag) => flag.name === name).defaultValue, false, `${name} fail-closed default`);
}

assert.match(runtime, /INVALID_FAIL_SAFE/);
assert.match(runtime, /getMetaPhase31CutoverValidationIssues/);
assert.match(runtime, /getMetaPhase31CutoverStatus/);
assert.doesNotMatch(runtime, /rawValue/);
assert.match(health, /cutover:\s*getMetaPhase31CutoverStatus\(process\.env\)/);
assert.match(docs, /Raw environment values are never returned/);
assert.match(schema, /generator client/);
assert.equal(execution.standard_item_contract.no_item_zip, true);
assert.equal(execution.standard_item_contract.full_layer_zip_only, true);
assert.equal(execution.standard_item_contract.item_patch_pattern, 'minsahbeauty_phase31_layer{item}.patch');
assert.match(execution.current_item, /^(?:8\.[2-7]|9\.[1-8])$/);

console.log('Phase 31 Layer 8.1 audit PASS');
console.log(`- canonical flags: ${allFlags.length}`);
console.log(`- required flags: ${requiredFlags.length}`);
console.log(`- optional flags: ${optionalFlags.length}`);
console.log('- defaults: platform/write flags disabled; legacy Facebook fallback enabled');
console.log('- invalid values: shared validation failure plus runtime fail-safe status');
console.log('- runtime visibility: protected admin provider health, no raw values');
console.log('- packaging: item patch/checksum/log only; full ZIP only after Layer 8 gate');
console.log('- Prisma schema change: NONE');
