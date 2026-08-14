#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function add(ok, message) {
  checks.push({ ok: Boolean(ok), message });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function has(relativePath, needle) {
  return exists(relativePath) && read(relativePath).includes(needle);
}

function hasAll(relativePath, needles) {
  const text = exists(relativePath) ? read(relativePath) : '';
  return needles.every((needle) => text.includes(needle));
}

function packageScripts() {
  return JSON.parse(read('package.json')).scripts ?? {};
}

const envKeys = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'PASSWORD_RESET_TOKEN_SECRET',
  'PASSWORD_RESET_OTP_WEBHOOK_URL',
  'PASSWORD_RESET_OTP_WEBHOOK_SECRET',
  'DATABASE_URL',
  'DIRECT_URL',
  'REDIS_URL',
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_USE_SSL',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET_NAME',
  'NEXT_PUBLIC_MINIO_PUBLIC_URL',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'PAYMENT_WEBHOOK_SECRET',
  'META_BROWSER_PURCHASE_TOKEN_SECRET',
  'NEXT_PUBLIC_META_PIXEL_ID',
  'META_DATASET_ID',
  'META_CAPI_ACCESS_TOKEN',
  'META_GRAPH_API_VERSION',
  'NEXT_PUBLIC_GA4_MEASUREMENT_ID',
  'GA4_API_SECRET',
  'TRACKING_HEALTH_CRON_SECRET',
  'TRACKING_CLEANUP_CRON_SECRET',
  'TRACKING_DEPLOY_GATE_LIVE_REDIS',
  'DISABLE_EMBEDDED_WORKERS',
  'META_CAPI_WORKER_PROCESS_VERIFIED',
];

const envAuditCodes = [
  'APP_URL_READY',
  'DATABASE_READY',
  'REDIS_ENV_READY',
  'NEXTAUTH_SECRET_READY',
  'JWT_SECRET_READY',
  'JWT_REFRESH_SECRET_READY',
  'PASSWORD_RESET_TOKEN_SECRET_READY',
  'PASSWORD_RESET_OTP_WEBHOOK_READY',
  'PAYMENT_WEBHOOK_SECRET_READY',
  'BROWSER_PURCHASE_TOKEN_SECRET_READY',
  'MINIO_ENDPOINT_READY',
  'MINIO_PORT_READY',
  'MINIO_SSL_FLAG_READY',
  'MINIO_ACCESS_KEY_READY',
  'MINIO_SECRET_KEY_READY',
  'MINIO_BUCKET_READY',
  'MINIO_PUBLIC_URL_READY',
  'UNPAID_ORDER_CRON_SECRET_READY',
  'META_PIXEL_READY',
  'META_DATASET_READY',
  'META_CAPI_TOKEN_READY',
  'META_GRAPH_VERSION_READY',
  'GA4_MEASUREMENT_READY',
  'GA4_API_SECRET_READY',
  'TRACKING_CRON_SECRET_READY',
  'NO_PUBLIC_SECRET_ENV',
  'AUTH_SECRETS_SEPARATED',
];

const runtimeCodes = [
  'QUEUE_FILE_PRESENT',
  'WORKER_FILE_PRESENT',
  'TRACKING_HEALTH_ROUTE_PRESENT',
  'TRACKING_HEALTH_CLI_PRESENT',
  'PRODUCTION_QA_ROUTE_PRESENT',
  'QUEUE_RETRY_CONFIG_PRESENT',
  'WORKER_PURCHASE_HANDLERS_PRESENT',
  'WORKER_START_PATH_PRESENT',
  'WORKER_SCRIPT_PRESENT',
  'TRACKING_HEALTH_CRON_SCRIPT_PRESENT',
  'CRON_SECRET_GUARD_PRESENT',
  'MASTER_DEPLOY_GATE_SCRIPT_PRESENT',
  'PREDEPLOY_INCLUDES_TRACKING_GATE',
  'REDIS_URL_SHAPE_OK',
  'REDIS_LIVE_PING_OK',
  'REDIS_LIVE_PING_SKIPPED',
];

for (const file of [
  '.env.example',
  'ENVIRONMENT_VARIABLES_PRODUCTION.md',
  'scripts/tracking-env-audit.mjs',
  'scripts/tracking-runtime-health-check.mjs',
  'scripts/tracking-deploy-gate.mjs',
  'app/api/cron/release-unpaid-orders/route.ts',
  'package.json',
]) {
  add(exists(file), `${file} exists`);
}

for (const key of envKeys) {
  add(has('.env.example', `${key}=`), `.env.example includes ${key}`);
  add(has('ENVIRONMENT_VARIABLES_PRODUCTION.md', `\`${key}\``), `Production env docs document ${key}`);
}

for (const code of envAuditCodes) {
  add(has('scripts/tracking-env-audit.mjs', code), `tracking env audit includes ${code}`);
}

add(has('scripts/tracking-env-audit.mjs', 'isValidHttpsUrl'), 'tracking env audit validates HTTPS URLs for production webhooks/public media URLs');
add(has('scripts/tracking-env-audit.mjs', 'isValidMinioEndpoint'), 'tracking env audit validates MinIO endpoint host shape');
add(has('scripts/tracking-env-audit.mjs', 'isBooleanLiteral'), 'tracking env audit validates boolean env flags');
add(has('scripts/tracking-env-audit.mjs', 'PUBLIC_SECRET_ENV_FOUND'), 'tracking env audit blocks suspicious NEXT_PUBLIC_* secrets');
add(has('scripts/tracking-env-audit.mjs', 'PLACEHOLDER_CREDENTIALS_FOUND'), 'tracking env audit blocks placeholder credentials');

for (const code of runtimeCodes) {
  add(has('scripts/tracking-runtime-health-check.mjs', code) || has('scripts/tracking-deploy-gate.mjs', code), `runtime/deploy gate includes ${code}`);
}

add(hasAll('scripts/tracking-deploy-gate.mjs', [
  'runTrackingEnvAudit',
  'runTrackingRuntimeHealthCheck',
  'mergeResults',
]), 'tracking deploy gate merges env and runtime gates');
add(has('scripts/tracking-deploy-gate.mjs', 'fail-on-warn'), 'tracking deploy gate supports --fail-on-warn');
add(has('scripts/tracking-runtime-health-check.mjs', 'TRACKING_DEPLOY_GATE_LIVE_REDIS'), 'runtime health supports live Redis gate from env');
add(has('scripts/tracking-runtime-health-check.mjs', 'pingRedis'), 'runtime health can live-ping Redis');

const releaseCron = read('app/api/cron/release-unpaid-orders/route.ts');
add(!releaseCron.includes('if (!secret) return true'), 'release-unpaid-orders cron no longer fails open when secret is missing');
add(hasAll('app/api/cron/release-unpaid-orders/route.ts', [
  "process.env.NODE_ENV !== 'production'",
  'queryTokenAllowed',
  'authorization',
  'x-cron-secret',
]), 'release-unpaid-orders cron fails closed in production and rejects query-string secret in production');

const scripts = packageScripts();
add(scripts['qa:phase8-production-runtime'] === 'node scripts/phase8-production-runtime-readiness-audit.mjs', 'package exposes qa:phase8-production-runtime');
add(scripts['qa:tracking-env'] === 'node scripts/tracking-env-audit.mjs --production', 'package exposes qa:tracking-env production script');
add(scripts['qa:tracking-runtime-health'] === 'node scripts/tracking-runtime-health-check.mjs --production', 'package exposes qa:tracking-runtime-health production script');
add(scripts['qa:tracking-deploy-gate'] === 'node scripts/tracking-deploy-gate.mjs --production', 'package exposes qa:tracking-deploy-gate production script');
add(String(scripts['qa:predeploy'] ?? '').includes('qa:phase8-production-runtime'), 'qa:predeploy includes Phase 8 static runtime gate');
add(String(scripts['qa:predeploy'] ?? '').includes('qa:tracking-deploy-gate'), 'qa:predeploy includes production tracking deploy gate');

add(has('.deployignore', '.env') && has('.deployignore', '!.env.example'), '.deployignore excludes real env files but keeps .env.example');
add(has('ENVIRONMENT_VARIABLES_PRODUCTION.md', 'npm run qa:phase8-production-runtime'), 'production env docs include Phase 8 gate command');
add(has('ENVIRONMENT_VARIABLES_PRODUCTION.md', 'TRACKING_DEPLOY_GATE_LIVE_REDIS=true npm run qa:tracking-deploy-gate'), 'production env docs include live Redis verification command');

for (const check of checks) {
  console.log(`${check.ok ? '✅' : '❌'} ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nPhase 8 production runtime readiness audit failed: ${checks.length - failed.length}/${checks.length} passed, ${failed.length} failed.`);
  process.exit(1);
}

console.log(`\nPhase 8 production runtime readiness audit: ${checks.length}/${checks.length} checks passed.`);
