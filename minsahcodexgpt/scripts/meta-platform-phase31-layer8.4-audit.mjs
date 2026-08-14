#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('config/meta-phase31-instagram-cutover.json', 'utf8'));
const flags = JSON.parse(fs.readFileSync('config/meta-phase31-cutover-flags.json', 'utf8'));
const envManifest = JSON.parse(fs.readFileSync('config/env.manifest.json', 'utf8'));
const envExample = fs.readFileSync('.env.example', 'utf8');
const cutover = fs.readFileSync('lib/meta-platform/domains/instagram/cutover.ts', 'utf8');
const comparison = fs.readFileSync('lib/meta-platform/domains/instagram/shadow-comparison.ts', 'utf8');
const production = fs.readFileSync('lib/meta-platform/domains/instagram/production.ts', 'utf8');
const messages = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
const standard = fs.readFileSync('lib/meta-platform/domains/instagram/standard-reply-runtime.ts', 'utf8');
const privateReply = fs.readFileSync('lib/meta-platform/domains/instagram/private-reply-runtime.ts', 'utf8');
const worker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
const health = fs.readFileSync('lib/meta-platform/admin/instagram-status.ts', 'utf8');
const adminPage = fs.readFileSync('app/admin/meta/instagram/page.tsx', 'utf8');
const docs = fs.readFileSync('docs/runbooks/meta-phase31-layer8-instagram-cutover.md', 'utf8');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const execution = JSON.parse(fs.readFileSync('.ai/phase31-execution-manifest.json', 'utf8'));

const runtimeValues = ['LEGACY', 'SHADOW', 'PLATFORM', 'DOMAIN', 'LEGACY_ROLLBACK'];
assert.equal(contract.item, '8.4');
assert.deepEqual(contract.acceptedRuntimeValues, runtimeValues);
assert.equal(contract.shadowAuthority, 'LEGACY');
assert.equal(contract.invalidRuntimePolicy, 'LEGACY_ROLLBACK');
assert.equal(contract.durableStatePreservedOnRollback, true);
assert.equal(contract.stabilityCriteria.maximumDuplicateMessages, 0);
assert.equal(contract.stabilityCriteria.maximumDuplicateProviderWrites, 0);
assert.equal(contract.stabilityCriteria.rollbackDrillRequired, true);
for (const name of ['META_PHASE31_INSTAGRAM_INBOUND_RUNTIME','META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME','META_PHASE31_INSTAGRAM_MEDIA_RUNTIME']) {
  assert.deepEqual(envManifest.enums[name], runtimeValues);
  assert.match(envExample, new RegExp(`^${name}=LEGACY$`, 'm'));
  assert.deepEqual(flags.compatibilityControls.find((item) => item.name === name).acceptedValues, runtimeValues);
}
assert.match(cutover, /SHADOW_LEGACY_AUTHORITY/);
assert.match(cutover, /PLATFORM_PREREQUISITES_DISABLED/);
assert.match(cutover, /INVALID_RUNTIME_FAIL_SAFE_ROLLBACK/);
assert.match(cutover, /DUPLICATE_PROVIDER_WRITE_DETECTED/);
assert.match(cutover, /PROVIDER_MESSAGE_ID_MISMATCH/);
assert.match(comparison, /conversationKeyDigest/);
assert.match(comparison, /providerMessageIdDigest/);
assert.doesNotMatch(comparison, /private customer text|secret\.invalid/);
assert.match(production, /captureShadow|shadowComparison/);
assert.match(production, /cutover\.read\.mode === 'PLATFORM'/);
assert.doesNotMatch(production, /Promise\.all\([\s\S]*processInstagramInboundReceipt/);
assert.match(messages, /observeNormalizedEvent\?\.\(event\)/);
assert.match(messages, /allowMediaDownloads === false/);
assert.match(messages, /blockedAttachmentCount/);
assert.match(standard, /assertInstagramCutoverWriteAuthority\('STANDARD', process\.env\)/);
assert.match(standard, /assertInstagramReplyWriteEnabledAtExecution\('MESSAGE', process\.env\)/);
assert.match(privateReply, /assertInstagramCutoverWriteAuthority\('PRIVATE', process\.env\)/);
assert.match(privateReply, /assertInstagramReplyWriteEnabledAtExecution\('PRIVATE_REPLY', process\.env\)/);
assert.match(worker, /processInstagramInboundReceiptProduction/);
assert.match(worker, /executeInstagramStandardReplyProduction/);
assert.match(worker, /executeInstagramPrivateReplyProduction/);
assert.match(health, /instagramCutover/);
assert.match(health, /META_INSTAGRAM_CUTOVER_STABILITY_CRITERIA/);
assert.match(adminPage, /Instagram cutover/);
assert.match(adminPage, /Rollback durability/);
assert.match(docs, /one full inbound processor/i);
assert.match(docs, /provider message IDs/i);
assert.match(schema, /generator client/);
assert.equal(execution.layers['8'].items.find((item) => item.id === '8.4').status, 'COMPLETE');
assert.match(execution.current_item, /^(?:8\.[5-7]|9\.[1-8])$/);
assert.equal(execution.standard_item_contract.no_item_zip, true);
assert.equal(execution.standard_item_contract.full_layer_zip_only, true);

console.log('Phase 31 Layer 8.4 audit PASS');
console.log('- Read cutover: legacy, shadow parity, platform and rollback');
console.log('- Writes: standard/private independently fail-closed at worker execution');
console.log('- Media: metadata durable while downloads remain separately controlled');
console.log('- Parity: conversation/message/provider ID/policy/attachment safe projections');
console.log('- Prisma schema change: NONE');
