#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTikTokTrackingDeployGate } from './tiktok-tracking-deploy-gate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const checks = [];
const issues = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    issues.push(`Missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function expect(name, condition, details = '') {
  const ok = Boolean(condition);
  checks.push({ name, ok, details });
  if (!ok) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, tokens) {
  return tokens.every((token) => content.includes(token));
}

function codeSet(result) {
  return new Set(result.checks.map((check) => check.code));
}

const gate = read('scripts/tiktok-tracking-deploy-gate.mjs');
const trackingGate = read('scripts/tracking-deploy-gate.mjs');
const packageJson = JSON.parse(read('package.json') || '{}');
const phase31Plan = read('PHASE31_TIKTOK_TRACKING_FIX_AND_META_GA4_SAFETY.md');
const changes = read('CHANGES.md');

expect('Standalone TikTok deploy gate script exists and exports runner', includesAll(gate, [
  'export function runTikTokTrackingDeployGate',
  'addStaticProjectChecks',
  'addEnvChecks',
  'TIKTOK_CSP_ALLOWED_WITH_META_GA4_PRESERVED',
  'TIKTOK_BROWSER_PURCHASE_BLOCKED_AND_PAYLOAD_MAPPER_PRESENT',
  'TIKTOK_EVENTS_API_SENDER_SCHEMA_AND_MATCH_KEYS_PRESENT',
  'TIKTOK_VERIFIED_PURCHASE_GATES_PRESENT',
  'TIKTOK_FAKE_ROAS_AND_MOCK_TRAFFIC_REMOVED',
]));

expect('TikTok deploy gate enforces official endpoint/schema and server-only token safety', includesAll(gate, [
  'TIKTOK_EVENTS_API_URL_VALID',
  '/open_api/',
  '/event/track/',
  'TIKTOK_ACCESS_TOKEN_EXPOSED_PUBLICLY',
  'NEXT_PUBLIC_TIKTOK_ACCESS_TOKEN',
  'TIKTOK_TEST_EVENT_CODE_SET_FOR_LIVE_PURCHASE',
  'TIKTOK_PURCHASE_LIVE_NOT_VERIFIED_FOR_ENABLED_EVENTS_API',
]));

expect('TikTok deploy gate validates configurable ttclid retention', includesAll(gate, [
  'TIKTOK_CLICK_ID_RETENTION_VALID',
  'TIKTOK_CLICK_ID_RETENTION_INVALID',
  'TIKTOK_CLICK_ID_MAX_AGE_DAYS',
  'NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS',
  'days > 365',
]));

expect('Existing production tracking deploy gate merges TikTok static gate additively', includesAll(trackingGate, [
  "import { runTikTokTrackingDeployGate } from './tiktok-tracking-deploy-gate.mjs';",
  'const checks = [...envResult.checks, ...runtimeResult.checks, ...tiktokResult.checks];',
  'tiktok: tiktokResult',
  'runTikTokTrackingDeployGate({ root, env, productionMode })',
]));

expect('Existing production tracking deploy gate still keeps Meta/GA4 env/runtime sections', includesAll(trackingGate, [
  'runTrackingEnvAudit',
  'runTrackingRuntimeHealthCheck',
  'environment: envResult',
  'runtime: runtimeResult',
  'META_TEST_EVENT_DISABLED_IN_PRODUCTION',
  'REDIS_URL_SHAPE_OK',
]));

expect('Package exposes standalone TikTok deploy gate and full TikTok tracking QA chain',
  packageJson.scripts?.['qa:tiktok-deploy-gate'] === 'node scripts/tiktok-tracking-deploy-gate.mjs --production'
  && packageJson.scripts?.['qa:phase31f-tiktok-deploy-gate'] === 'node scripts/phase31f-tiktok-deploy-gate-audit.mjs'
  && packageJson.scripts?.['qa:phase31-tiktok'] === 'npm run qa:tiktok-tracking'
  && String(packageJson.scripts?.['qa:tiktok-tracking'] || '').includes('qa:phase31b-tiktok-browser')
  && String(packageJson.scripts?.['qa:tiktok-tracking'] || '').includes('qa:phase31c-tiktok-attribution')
  && String(packageJson.scripts?.['qa:tiktok-tracking'] || '').includes('qa:phase31d-tiktok-events-api')
  && String(packageJson.scripts?.['qa:tiktok-tracking'] || '').includes('qa:phase31e-tiktok-health')
  && String(packageJson.scripts?.['qa:tiktok-tracking'] || '').includes('qa:tiktok-deploy-gate')
  && String(packageJson.scripts?.['qa:tiktok-tracking'] || '').includes('qa:phase31f-tiktok-deploy-gate')
);

expect('Predeploy chain keeps existing exact command and receives TikTok checks through qa:tracking-deploy-gate', String(packageJson.scripts?.['qa:predeploy'] || '').includes('npm run qa:tracking-deploy-gate') && !String(packageJson.scripts?.['qa:predeploy'] || '').includes('npm run qa:tiktok-tracking'));

const disabledEnvResult = runTikTokTrackingDeployGate({
  root,
  productionMode: true,
  env: {
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: 'false',
    TIKTOK_EVENTS_API_ENABLED: 'false',
  },
});
const disabledCodes = codeSet(disabledEnvResult);
expect('TikTok deploy gate allows safe disabled rollout with warnings only',
  disabledEnvResult.ok
  && disabledEnvResult.blockerCount === 0
  && disabledCodes.has('TIKTOK_PIXEL_DISABLED')
  && disabledCodes.has('TIKTOK_EVENTS_API_DISABLED')
);

const missingTokenResult = runTikTokTrackingDeployGate({
  root,
  productionMode: true,
  env: {
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: 'true',
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_EVENTS_API_ENABLED: 'true',
    TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_EVENTS_API_URL: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    TIKTOK_PURCHASE_LIVE_VERIFIED: 'true',
    TIKTOK_CLICK_ID_MAX_AGE_DAYS: '90',
  },
});
const missingTokenCodes = codeSet(missingTokenResult);
expect('TikTok deploy gate blocks enabled Events API without server access token',
  !missingTokenResult.ok
  && missingTokenCodes.has('TIKTOK_ACCESS_TOKEN_MISSING_OR_PLACEHOLDER')
);

const publicTokenResult = runTikTokTrackingDeployGate({
  root,
  productionMode: true,
  env: {
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: 'true',
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_EVENTS_API_ENABLED: 'true',
    TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_ACCESS_TOKEN: 'real_tiktok_access_token_value_that_is_long_enough_12345',
    NEXT_PUBLIC_TIKTOK_ACCESS_TOKEN: 'leaked_public_token_value_that_should_block',
    TIKTOK_EVENTS_API_URL: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    TIKTOK_PURCHASE_LIVE_VERIFIED: 'true',
    TIKTOK_CLICK_ID_MAX_AGE_DAYS: '90',
  },
});
const publicTokenCodes = codeSet(publicTokenResult);
expect('TikTok deploy gate blocks leaked NEXT_PUBLIC TikTok access token',
  !publicTokenResult.ok
  && publicTokenCodes.has('TIKTOK_ACCESS_TOKEN_EXPOSED_PUBLICLY')
);

const invalidRetentionResult = runTikTokTrackingDeployGate({
  root,
  productionMode: true,
  env: {
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: 'true',
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_EVENTS_API_ENABLED: 'true',
    TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_ACCESS_TOKEN: 'real_tiktok_access_token_value_that_is_long_enough_12345',
    TIKTOK_EVENTS_API_URL: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    TIKTOK_PURCHASE_LIVE_VERIFIED: 'true',
    TIKTOK_CLICK_ID_MAX_AGE_DAYS: '999',
  },
});
const invalidRetentionCodes = codeSet(invalidRetentionResult);
expect('TikTok deploy gate blocks invalid ttclid retention values',
  !invalidRetentionResult.ok
  && invalidRetentionCodes.has('TIKTOK_CLICK_ID_RETENTION_INVALID')
);

const testCodeResult = runTikTokTrackingDeployGate({
  root,
  productionMode: true,
  env: {
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: 'true',
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_EVENTS_API_ENABLED: 'true',
    TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_ACCESS_TOKEN: 'real_tiktok_access_token_value_that_is_long_enough_12345',
    TIKTOK_EVENTS_API_URL: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    TIKTOK_PURCHASE_LIVE_VERIFIED: 'true',
    TIKTOK_TEST_EVENT_CODE: 'TEST123',
    TIKTOK_CLICK_ID_MAX_AGE_DAYS: '90',
  },
});
const testCodeCodes = codeSet(testCodeResult);
expect('TikTok deploy gate blocks live production Purchase with test event code still set',
  !testCodeResult.ok
  && testCodeCodes.has('TIKTOK_TEST_EVENT_CODE_SET_FOR_LIVE_PURCHASE')
);

const validEnabledResult = runTikTokTrackingDeployGate({
  root,
  productionMode: true,
  env: {
    NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED: 'true',
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_EVENTS_API_ENABLED: 'true',
    TIKTOK_PIXEL_ID: 'C123456789ABCDE',
    TIKTOK_ACCESS_TOKEN: 'real_tiktok_access_token_value_that_is_long_enough_12345',
    TIKTOK_EVENTS_API_URL: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    TIKTOK_PURCHASE_LIVE_VERIFIED: 'true',
    TIKTOK_CLICK_ID_MAX_AGE_DAYS: '90',
  },
});
const validEnabledCodes = codeSet(validEnabledResult);
expect('TikTok deploy gate passes a fully configured enabled TikTok setup',
  validEnabledResult.ok
  && validEnabledResult.blockerCount === 0
  && validEnabledCodes.has('TIKTOK_PIXEL_ENV_READY')
  && validEnabledCodes.has('TIKTOK_EVENTS_API_PIXEL_ID_READY')
  && validEnabledCodes.has('TIKTOK_ACCESS_TOKEN_SERVER_ENV_READY')
  && validEnabledCodes.has('TIKTOK_PURCHASE_LIVE_VERIFIED')
  && validEnabledCodes.has('TIKTOK_CLICK_ID_RETENTION_VALID')
);

expect('Phase handoff document includes Phase 31F deploy gate guidance', includesAll(phase31Plan, [
  'Phase 31F',
  'Deploy Gate',
  'qa:tiktok-tracking',
  'qa:phase31f-tiktok-deploy-gate',
]));

expect('Changelog documents Phase 31F', includesAll(changes, [
  'Phase 31F',
  'TikTok Deploy Gate',
  'qa:tiktok-tracking',
]));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
