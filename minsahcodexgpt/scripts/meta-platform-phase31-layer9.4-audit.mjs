#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));
const pkg = json('package.json');
const execution = json('.ai/phase31-execution-manifest.json');
const testFile = 'tests/meta-v6/phase31-layer9.4-lead-domain.test.mjs';
const tests = read(testFile);
const fetchContract = read('lib/meta-platform/domains/leads/fetch-contract.ts');
const fetchRuntime = read('lib/meta/leads/fetch.ts');
const ownership = read('lib/meta-platform/domains/leads/ownership-policy.ts');
const leadRuntime = read('lib/meta-platform/domains/leads/runtime.ts');
const processLead = read('lib/meta-platform/domains/leads/process-lead.ts');
const testLead = read('lib/meta-platform/domains/leads/test-lead.ts');
const cutover = read('lib/meta-platform/domains/leads/cutover.ts');

assert.equal(fs.existsSync(testFile), true);
assert.equal(
  pkg.scripts['test:meta-v6-phase31-layer9.4'],
  'node --experimental-strip-types --test tests/meta-v6/phase31-layer9.4-lead-domain.test.mjs',
);
assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.4'], 'node scripts/meta-platform-phase31-layer9.4-audit.mjs');
assert.equal(
  pkg.scripts['qa:phase31-meta-layer9.4'],
  'npm run test:meta-v6-phase31-layer9.4 && npm run qa:meta-platform-phase31-layer9.4 && npm run qa:phase31-meta-leads',
);
assert.match(execution.current_item, /^(?:9\.4|9\.[5-8])$/);
assert.equal(execution.layers['9'].items.find((item) => item.id === '9.4')?.schema_change_expected, false);

for (const field of [
  'id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name',
  'form_id', 'field_data', 'is_organic', 'platform', 'partner_name', 'retailer_item_id', 'is_test_lead',
]) assert.match(fetchContract, new RegExp(`['"]${field}['"]`));
assert.match(fetchContract, /fetchMetaLeadWithClient/);
assert.match(fetchContract, /META_LEAD_ID_MISMATCH/);
assert.match(fetchContract, /META_LEAD_TOO_OLD/);
assert.match(fetchContract, /META_LEAD_TOKEN_ERROR/);
assert.match(fetchContract, /META_LEAD_NOT_FOUND/);
assert.match(fetchRuntime, /fetchMetaLeadWithClient/);
assert.doesNotMatch(fetchRuntime, /const LEAD_FIELDS/);

assert.match(ownership, /META_LEAD_RECEIPT_FORM_MISMATCH/);
assert.match(ownership, /META_LEAD_FORM_OWNERSHIP_MISMATCH/);
assert.match(leadRuntime, /evaluateMetaLeadFormOwnership/);
assert.ok(leadRuntime.lastIndexOf('evaluateMetaLeadFormOwnership') < leadRuntime.lastIndexOf('ensureMetaLeadStorageIdentities'));
assert.match(processLead, /ALREADY_COMPLETED/);
assert.match(processLead, /await input\.fail/);
assert.match(testLead, /isolateFromCrm: true/);
assert.match(testLead, /suppressNotifications: true/);
assert.match(cutover, /LEGACY_ROLLBACK/);
assert.match(cutover, /runLegacy/);

for (const phrase of [
  'Leadgen receipt is durable',
  'full Lead fetch requests the complete field contract',
  'duplicate provider Lead creates one normalized Lead',
  'missing or mismatched form mapping',
  'expired/missing access',
  'CRM handoff records one successful assignment',
  'CRM retry is replay-safe',
  'provider Test Lead is isolated',
  'Lead logs and admin-safe projections redact PII',
  'feature-flag rollback returns Lead authority to legacy',
]) assert.match(tests, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync('prisma/schema.prisma')).digest('hex'),
  'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log('Phase 31 Layer 9.4 Lead Ads domain audit: PASS');
console.log('- Leadgen receipt, complete fetch and ownership policy: covered');
console.log('- duplicate Lead and CRM handoff/retry safety: covered');
console.log('- Test Lead isolation, PII redaction and rollback: covered');
console.log('- live Meta provider evidence: deferred to Layer 9.7');
console.log('- Prisma schema change: NONE');
