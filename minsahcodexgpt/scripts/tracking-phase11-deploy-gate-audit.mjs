#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const checks = [];
const issues = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    issues.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expect(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
  if (!condition) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

const envAudit = read('scripts/tracking-env-audit.mjs');
expect('tracking-env-audit script exists', envAudit.length > 0);
for (const token of [
  'runTrackingEnvAudit',
  'loadTrackingDeployEnv',
  'PLACEHOLDER_PATTERNS',
  'META_TEST_EVENT_CODE',
  'META_CAPI_ACCESS_TOKEN',
  'FACEBOOK_CONVERSION_API_TOKEN',
  'NEXT_PUBLIC_META_PIXEL_ID',
  'GA4_API_SECRET',
  'GOOGLE_ANALYTICS_API_SECRET',
  'TRACKING_HEALTH_CRON_SECRET',
  'NO_PLACEHOLDER_CREDENTIALS',
  'PUBLIC_SECRET_ENV_FOUND',
  'JWT_SECRETS_REUSED',
]) {
  expect(`tracking-env-audit contains ${token}`, envAudit.includes(token));
}
expect('tracking-env-audit validates Redis URL shape', envAudit.includes('isValidRedisUrl') && envAudit.includes("redis:") && envAudit.includes("rediss:"));
expect('tracking-env-audit validates Meta Pixel ID shape', envAudit.includes('isLikelyMetaPixelId') && envAudit.includes('\\d{10,30}'));
expect('tracking-env-audit validates GA4 Measurement ID shape', envAudit.includes('isLikelyGa4MeasurementId') && envAudit.includes('G-[A-Z0-9]'));
expect('tracking-env-audit blocks production test event code', envAudit.includes('META_TEST_EVENT_ENABLED_IN_PRODUCTION') && envAudit.includes('Remove META_TEST_EVENT_CODE before live deploy'));

const runtime = read('scripts/tracking-runtime-health-check.mjs');
expect('tracking-runtime-health-check script exists', runtime.length > 0);
for (const token of [
  'runTrackingRuntimeHealthCheck',
  'REDIS_URL_SHAPE_OK',
  'REDIS_LIVE_PING_OK',
  'REDIS_LIVE_PING_SKIPPED',
  'meta-provider',
  'startMetaCapiWorker',
  'processMetaOutboxById',
  'TRACKING_HEALTH_CRON_SECRET',
  'CRON_SECRET_GUARD_PRESENT',
  'WORKER_SCRIPT_PRESENT',
  'TRACKING_HEALTH_CRON_SCRIPT_PRESENT',
  'MASTER_DEPLOY_GATE_SCRIPT_PRESENT',
]) {
  expect(`tracking-runtime-health-check contains ${token}`, runtime.includes(token));
}
expect('runtime check can optionally ping Redis through ioredis', runtime.includes("await import('ioredis')") && runtime.includes('TRACKING_DEPLOY_GATE_LIVE_REDIS'));
expect('runtime check validates external worker mode', runtime.includes('DISABLE_EMBEDDED_WORKERS') && runtime.includes('META_CAPI_WORKER_PROCESS_VERIFIED'));

const deployGate = read('scripts/tracking-deploy-gate.mjs');
expect('tracking-deploy-gate script exists', deployGate.length > 0);
for (const token of [
  'runTrackingDeployGate',
  'Production tracking deploy gate passed',
  'Production tracking deploy gate blocked',
  'No placeholder credentials',
  'No production test event code',
  'Redis/queue config present',
  'Meta/GA4 env present',
  'runTrackingEnvAudit',
  'runTrackingRuntimeHealthCheck',
]) {
  expect(`tracking-deploy-gate contains ${token}`, deployGate.includes(token));
}
expect('deploy gate exits non-zero on blockers', deployGate.includes('process.exitCode = 1') && deployGate.includes('!result.ok'));

const packageJson = JSON.parse(read('package.json') || '{}');
expect('package.json exposes qa:tracking-env', packageJson.scripts?.['qa:tracking-env'] === 'node scripts/tracking-env-audit.mjs --production');
expect('package.json exposes qa:tracking-runtime-health', packageJson.scripts?.['qa:tracking-runtime-health'] === 'node scripts/tracking-runtime-health-check.mjs --production');
expect('package.json exposes qa:tracking-deploy-gate', packageJson.scripts?.['qa:tracking-deploy-gate'] === 'node scripts/tracking-deploy-gate.mjs --production');
expect('package.json exposes qa:phase11-deploy-gate', packageJson.scripts?.['qa:phase11-deploy-gate'] === 'node scripts/tracking-phase11-deploy-gate-audit.mjs');
expect('qa:predeploy includes qa:tracking-deploy-gate', packageJson.scripts?.['qa:predeploy']?.includes('qa:tracking-deploy-gate'));
expect('qa:predeploy keeps security/static/phase12 gates', packageJson.scripts?.['qa:predeploy']?.includes('audit:security') && packageJson.scripts?.['qa:predeploy']?.includes('qa:phase8-static') && packageJson.scripts?.['qa:predeploy']?.includes('qa:phase12'));

const docs = read('docs/production/tracking-deploy-gate.md');
expect('tracking deploy gate docs exist', docs.length > 0);
for (const token of [
  'npm run qa:tracking-deploy-gate',
  'TRACKING_DEPLOY_GATE_LIVE_REDIS=true',
  'META_TEST_EVENT_CODE',
  'REDIS_URL',
  'TRACKING_HEALTH_CRON_SECRET',
  'Production tracking deploy gate passed',
]) {
  expect(`tracking deploy gate docs contain ${token}`, docs.includes(token));
}

const envDoc = read('ENVIRONMENT_VARIABLES_PRODUCTION.md');
expect('production env docs mention qa:tracking-deploy-gate', envDoc.includes('qa:tracking-deploy-gate'));
expect('production env docs mention live Redis gate', envDoc.includes('TRACKING_DEPLOY_GATE_LIVE_REDIS'));
expect('production env docs mention external worker verification flag', envDoc.includes('META_CAPI_WORKER_PROCESS_VERIFIED'));

const envExample = read('.env.example');
expect('.env.example exists', envExample.length > 0);
for (const token of [
  'NEXT_PUBLIC_META_PIXEL_ID=',
  'META_CAPI_ACCESS_TOKEN=',
  'GA4_API_SECRET=',
  'REDIS_URL=',
  'TRACKING_HEALTH_CRON_SECRET=',
  'META_TEST_EVENT_CODE=',
]) {
  expect(`.env.example contains ${token}`, envExample.includes(token));
}

const report = read('PHASE11_TRACKING_DEPLOY_GATE_HARDENING.md');
expect('Phase 11 delivery report exists', report.includes('Phase 11') && report.includes('Master Tracking Deploy Gate Hardening'));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
