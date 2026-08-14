import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  resolveFacebookRealtimeCutover,
} from '../../packages/meta-facebook-cutover-contract/src/index.ts';
import {
  evaluateMetaFacebookLegacyDisable,
  getMetaFacebookRealtimeCutoverStatus,
} from '../../lib/meta-platform/domains/facebook/cutover.ts';

const explicitLegacy = Object.freeze({
  META_PLATFORM_LEGACY_FACEBOOK: 'true',
  META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'LEGACY',
  REALTIME_FACEBOOK_MODE: 'legacy',
  REALTIME_RUNTIME_FLAVOR: 'legacy',
  REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED: 'true',
});
const platform = Object.freeze({
  META_PLATFORM_LEGACY_FACEBOOK: 'false',
  META_PLATFORM_SOCIAL_REALTIME: 'true',
  META_PLATFORM_SOCIAL_WEBHOOKS: 'true',
  META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'PLATFORM',
  REALTIME_FACEBOOK_MODE: 'bridge',
  REALTIME_RUNTIME_FLAVOR: 'bridge',
  REALTIME_FACEBOOK_LEGACY_ROLLBACK_ENABLED: 'false',
});

test('8.5 main-app default preserves legacy authority while realtime local process is safe-disabled', () => {
  const main = getMetaFacebookRealtimeCutoverStatus({});
  assert.equal(main.mode, 'LEGACY');
  assert.equal(main.authority, 'LEGACY');
  assert.equal(main.retryOwner, 'REALTIME_LEGACY');
  const realtime = resolveFacebookRealtimeCutover({}, { role: 'REALTIME' });
  assert.equal(realtime.mode, 'BLOCKED');
  assert.equal(realtime.active, false);
  assert.equal(realtime.reasonCode, 'LEGACY_RUNTIME_NOT_EXPLICITLY_ENABLED');
});

test('8.5 explicit legacy runtime owns provider ingress, direct client and retries singularly', () => {
  const status = resolveFacebookRealtimeCutover(explicitLegacy, { role: 'REALTIME' });
  assert.equal(status.mode, 'LEGACY');
  assert.equal(status.authority, 'LEGACY');
  assert.equal(status.legacyDirectClientEnabled, true);
  assert.equal(status.realtimeBridgeEnabled, false);
  assert.equal(status.providerIngressOwner, 'REALTIME_LEGACY');
  assert.equal(status.retryOwner, 'REALTIME_LEGACY');
});

test('8.5 shadow keeps legacy authority and allows only signed side-effect-free platform evaluation', () => {
  const env = { ...explicitLegacy, META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'SHADOW', META_PLATFORM_SOCIAL_WEBHOOKS: 'true' };
  const status = resolveFacebookRealtimeCutover(env, { role: 'REALTIME' });
  assert.equal(status.mode, 'SHADOW');
  assert.equal(status.authority, 'LEGACY');
  assert.equal(status.shadowPlatformEvaluationEnabled, true);
  assert.equal(status.shadowSideEffectsAllowed, false);
  assert.equal(status.retryOwner, 'REALTIME_LEGACY');
});

test('8.5 platform requires legacy off plus realtime and webhook flags', () => {
  const blocked = getMetaFacebookRealtimeCutoverStatus({ META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'PLATFORM' });
  assert.equal(blocked.mode, 'BLOCKED');
  assert.equal(blocked.reasonCode, 'PLATFORM_PREREQUISITES_DISABLED');
  const ready = resolveFacebookRealtimeCutover(platform, { role: 'REALTIME' });
  assert.equal(ready.mode, 'PLATFORM');
  assert.equal(ready.authority, 'PLATFORM');
  assert.equal(ready.platformSyncEnabled, true);
  assert.equal(ready.realtimeBridgeEnabled, true);
  assert.equal(ready.legacyDirectClientEnabled, false);
  assert.equal(ready.retryOwner, 'MAIN_APP_BULLMQ');
});

test('8.5 invalid flags and incompatible local selectors fail safe without any owner', () => {
  const invalid = resolveFacebookRealtimeCutover({ META_PLATFORM_SOCIAL_REALTIME: 'maybe' }, { role: 'REALTIME' });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.mode, 'BLOCKED');
  assert.equal(invalid.providerIngressOwner, 'NONE');
  assert.equal(invalid.retryOwner, 'NONE');
  const dualAttempt = resolveFacebookRealtimeCutover({ ...platform, META_PLATFORM_LEGACY_FACEBOOK: 'true' }, { role: 'REALTIME' });
  assert.equal(dualAttempt.mode, 'BLOCKED');
  assert.equal(dualAttempt.legacyDirectClientEnabled, false);
  assert.equal(dualAttempt.realtimeBridgeEnabled, false);
});

test('8.5 mode matrix never enables legacy direct client and platform bridge together', () => {
  const candidates = [
    {}, explicitLegacy,
    { ...explicitLegacy, META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'SHADOW', META_PLATFORM_SOCIAL_WEBHOOKS: 'true' },
    platform,
    { ...platform, META_PHASE31_FACEBOOK_INBOX_RUNTIME: 'LEGACY_ROLLBACK' },
  ];
  for (const env of candidates) {
    const status = resolveFacebookRealtimeCutover(env, { role: 'REALTIME' });
    assert.equal(status.legacyDirectClientEnabled && status.realtimeBridgeEnabled, false);
    assert.notEqual(status.retryOwner === 'REALTIME_LEGACY' && status.platformSyncEnabled, true);
  }
});

test('8.5 legacy disable requires shadow, duplicate, retry-owner, direct-client and rollback proof', () => {
  const blocked = evaluateMetaFacebookLegacyDisable({
    shadowSamples: 99, shadowMismatches: 0, duplicateEvents: 0, parallelRetryOwners: 0,
    legacyDirectClientCallsInPlatformMode: 0, observationMinutes: 1440, rollbackDrillPassed: true,
  });
  assert.equal(blocked.eligible, false);
  assert.deepEqual(blocked.blockers, ['INSUFFICIENT_SHADOW_SAMPLES']);
  const eligible = evaluateMetaFacebookLegacyDisable({
    shadowSamples: 1000, shadowMismatches: 1, duplicateEvents: 0, parallelRetryOwners: 0,
    legacyDirectClientCallsInPlatformMode: 0, observationMinutes: 1440, rollbackDrillPassed: true,
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.mismatchRateBasisPoints, 10);
});

test('8.5 environment validator rejects invalid Facebook selector', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-layer8.5-'));
  try {
    const envFile = path.join(dir, 'invalid.env');
    fs.writeFileSync(envFile, [
      'DATABASE_URL=postgresql://localhost:5432/app',
      `JWT_SECRET=${'a'.repeat(32)}`,
      `JWT_REFRESH_SECRET=${'b'.repeat(32)}`,
      'META_PHASE31_FACEBOOK_INBOX_RUNTIME=AUTO',
    ].join('\n'));
    const result = spawnSync(process.execPath, ['scripts/validate-env.mjs', '--file', envFile], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(`${result.stdout}\n${result.stderr}`, /META_PHASE31_FACEBOOK_INBOX_RUNTIME must be one of/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('8.5 production wiring isolates legacy clients, mirrors shadow and assigns one retry owner', () => {
  const bridge = fs.readFileSync('lib/meta-platform/domains/facebook/legacy-bridge.ts', 'utf8');
  const route = fs.readFileSync('app/api/webhook/facebook/route.ts', 'utf8');
  const realtimeApp = fs.readFileSync('realtime-service/src/app.ts', 'utf8');
  const realtimeIndex = fs.readFileSync('realtime-service/src/index.ts', 'utf8');
  const legacyWebhook = fs.readFileSync('realtime-service/src/routes/webhook.router.ts', 'utf8');
  assert.match(bridge, /assertFacebookPlatformSyncAuthority\(process\.env\)/);
  assert.match(bridge, /shadowSideEffectsAllowed: false/);
  assert.doesNotMatch(bridge, /syncRecentFacebookInboxLegacy\(/);
  assert.match(route, /requestKey: `\$\{digest\}:\$\{pageId\}`/);
  assert.match(route, /FACEBOOK_SHADOW_REQUIRES_SIGNED_LEGACY_MIRROR/);
  assert.match(legacyWebhook, /shadowPlatformEvaluationEnabled/);
  assert.match(legacyWebhook, /forwardFacebookWebhookToMainApp/);
  assert.match(realtimeApp, /legacyDirectClientEnabled/);
  assert.match(realtimeApp, /realtimeBridgeEnabled/);
  assert.match(realtimeIndex, /cutover\.retryOwner !== 'REALTIME_LEGACY'/);
  assert.doesNotMatch(realtimeApp, /import .*facebook\/graph\.client/);
});
