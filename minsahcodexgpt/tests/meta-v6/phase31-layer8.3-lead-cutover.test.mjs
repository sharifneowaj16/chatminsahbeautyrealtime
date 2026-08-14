import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  evaluateMetaLeadLegacyDisable,
  executeMetaLeadCutover,
  getMetaLeadCutoverStatus,
} from '../../lib/meta-platform/domains/leads/cutover.ts';
import { compareMetaLeadShadowNormalization } from '../../lib/meta-platform/domains/leads/shadow-comparison.ts';

const platformEnv = Object.freeze({
  META_PLATFORM_LEADS: 'true',
  META_PLATFORM_SOCIAL_WEBHOOKS: 'true',
});

test('8.3 defaults to legacy authority and requires both canonical prerequisites', () => {
  const defaultStatus = getMetaLeadCutoverStatus({});
  assert.equal(defaultStatus.mode, 'LEGACY');
  assert.equal(defaultStatus.authority, 'LEGACY');
  assert.equal(defaultStatus.reasonCode, 'SAFE_DEFAULT_LEGACY_AUTHORITY');

  const partial = getMetaLeadCutoverStatus({ META_PLATFORM_LEADS: 'true' });
  assert.equal(partial.mode, 'LEGACY');
  assert.equal(partial.reasonCode, 'SAFE_DEFAULT_LEGACY_AUTHORITY');

  const ready = getMetaLeadCutoverStatus(platformEnv);
  assert.equal(ready.mode, 'PLATFORM');
  assert.equal(ready.authority, 'PLATFORM');
});

test('8.3 shadow always keeps legacy authority and forbids shadow side effects', () => {
  const status = getMetaLeadCutoverStatus({ ...platformEnv, META_PHASE31_LEAD_RUNTIME: 'SHADOW' });
  assert.equal(status.mode, 'SHADOW');
  assert.equal(status.authority, 'LEGACY');
  assert.equal(status.shadowSideEffectsAllowed, false);
  assert.equal(status.reasonCode, 'SHADOW_LEGACY_AUTHORITY');
});

test('8.3 explicit rollback overrides enabled platform flags', () => {
  const status = getMetaLeadCutoverStatus({ ...platformEnv, META_PHASE31_LEAD_RUNTIME: 'LEGACY_ROLLBACK' });
  assert.equal(status.mode, 'LEGACY_ROLLBACK');
  assert.equal(status.authority, 'LEGACY');
  assert.equal(status.rollbackAvailable, true);
});

test('8.3 invalid runtime and invalid canonical values fail safe to rollback', () => {
  assert.equal(getMetaLeadCutoverStatus({ ...platformEnv, META_PHASE31_LEAD_RUNTIME: 'AUTO' }).mode, 'LEGACY_ROLLBACK');
  assert.equal(getMetaLeadCutoverStatus({ META_PLATFORM_LEADS: 'maybe' }).valid, false);
  assert.equal(getMetaLeadCutoverStatus({ META_PLATFORM_LEADS: 'maybe' }).authority, 'LEGACY');
});

test('8.3 executor invokes exactly one full authority processor', async () => {
  let legacyRuns = 0;
  let platformRuns = 0;
  const legacy = () => { legacyRuns += 1; return Promise.resolve({ value: { path: 'legacy' } }); };
  const platform = () => { platformRuns += 1; return Promise.resolve({ path: 'platform' }); };

  const shadow = await executeMetaLeadCutover({
    source: { ...platformEnv, META_PHASE31_LEAD_RUNTIME: 'SHADOW' },
    runLegacy: legacy,
    runPlatform: platform,
  });
  assert.equal(shadow.value.path, 'legacy');
  assert.equal(legacyRuns, 1);
  assert.equal(platformRuns, 0);

  const active = await executeMetaLeadCutover({ source: platformEnv, runLegacy: legacy, runPlatform: platform });
  assert.equal(active.value.path, 'platform');
  assert.equal(legacyRuns, 1);
  assert.equal(platformRuns, 1);
});

test('8.3 shadow comparison is measurable and contains no raw contact values', () => {
  const rawEmail = 'customer@example.test';
  const rawPhone = '+8801712345678';
  const comparison = compareMetaLeadShadowNormalization({
    id: 'lead-1', form_id: 'form-1', is_test_lead: false,
    field_data: [
      { name: 'full_name', values: ['Customer Name'] },
      { name: 'email', values: [rawEmail] },
      { name: 'phone_number', values: [rawPhone] },
      { name: 'city', values: ['Dhaka'] },
    ],
  });
  assert.equal(comparison.status, 'MATCH');
  assert.equal(comparison.matched, true);
  assert.equal(comparison.safeMetrics.comparedFieldCount, 11);
  assert.equal(comparison.safeMetrics.mismatchCount, 0);
  assert.equal(JSON.stringify(comparison).includes(rawEmail), false);
  assert.equal(JSON.stringify(comparison).includes(rawPhone), false);
});

test('8.3 legacy disable requires observation, zero duplicates and rollback proof', () => {
  const blocked = evaluateMetaLeadLegacyDisable({
    shadowSamples: 99, shadowMismatches: 0, duplicateHandoffs: 0,
    unresolvedPermanentFailures: 0, observationMinutes: 1440, rollbackDrillPassed: true,
  });
  assert.equal(blocked.eligible, false);
  assert.deepEqual(blocked.blockers, ['INSUFFICIENT_SHADOW_SAMPLES']);

  const eligible = evaluateMetaLeadLegacyDisable({
    shadowSamples: 1000, shadowMismatches: 1, duplicateHandoffs: 0,
    unresolvedPermanentFailures: 0, observationMinutes: 1440, rollbackDrillPassed: true,
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.mismatchRateBasisPoints, 10);
});

test('8.3 environment validator rejects an invalid Lead runtime selector', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'phase31-layer8.3-'));
  try {
    const envFile = path.join(dir, 'invalid.env');
    writeFileSync(envFile, [
      'DATABASE_URL=postgresql://localhost:5432/app',
      `JWT_SECRET=${'a'.repeat(32)}`,
      `JWT_REFRESH_SECRET=${'b'.repeat(32)}`,
      'META_PHASE31_LEAD_RUNTIME=AUTO',
    ].join('\n'));
    const result = spawnSync(process.execPath, ['scripts/validate-env.mjs', '--file', envFile], {
      cwd: process.cwd(), encoding: 'utf8',
    });
    assert.equal(result.status, 1);
    assert.match(`${result.stdout}\n${result.stderr}`, /META_PHASE31_LEAD_RUNTIME must be one of/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('8.3 production wiring captures a pure shadow projection without calling the platform processor', () => {
  const production = readFileSync('lib/meta-platform/domains/leads/production.ts', 'utf8');
  const legacy = readFileSync('lib/meta/leads/legacy-service.ts', 'utf8');
  const domain = readFileSync('lib/meta-platform/domains/leads/runtime.ts', 'utf8');
  assert.match(production, /executeMetaLeadCutover/);
  assert.match(production, /captureShadow/);
  assert.match(production, /compareMetaLeadShadowNormalization/);
  assert.match(legacy, /observeFetchedPayload/);
  assert.match(domain, /observeFetchedPayload/);
  assert.doesNotMatch(production, /Promise\.all\([\s\S]*processDomainMetaLeadReceipt/);
});
