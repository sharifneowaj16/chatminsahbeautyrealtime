#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function expect(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
  if (!condition) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function includesAll(content, values) {
  return values.every((value) => content.includes(value));
}

const schema = read('prisma/schema.prisma');
expect('MetaCapiFailure has Phase 16 retention/dead-letter fields', includesAll(schema, [
  'failureCategory',
  'lastRetryAt',
  'resolvedAt',
  'cleanupAfter',
  '@@index([failureCategory])',
  '@@index([cleanupAfter])',
]));

const migration = read('prisma/migrations/20260705040000_phase16_tracking_failure_retention/migration.sql');
expect('Phase 16 migration adds retention columns idempotently', includesAll(migration, [
  'ADD COLUMN IF NOT EXISTS "failureCategory"',
  'ADD COLUMN IF NOT EXISTS "cleanupAfter"',
  'CREATE INDEX IF NOT EXISTS "MetaCapiFailure_failureCategory_idx"',
  'CREATE INDEX IF NOT EXISTS "MetaCapiFailure_cleanupAfter_idx"',
]));
expect('Phase 16 migration backfills category and cleanupAfter for existing rows', includesAll(migration, [
  'UPDATE "MetaCapiFailure"',
  "'CRITICAL'",
  "'FINAL_RETRYABLE'",
  "INTERVAL '30 days'",
  "INTERVAL '90 days'",
  "INTERVAL '180 days'",
]));

const retention = read('lib/tracking/failure-retention.ts');
expect('failure-retention helper exposes retention env config', includesAll(retention, [
  'TRACKING_FAILURE_DEBUG_RETENTION_DAYS',
  'TRACKING_FAILURE_FINAL_RETENTION_DAYS',
  'TRACKING_FAILURE_CRITICAL_RETENTION_DAYS',
  'TRACKING_FAILURE_CLEANUP_LIMIT',
  'getTrackingFailureRetentionConfig',
]));
expect('failure-retention helper classifies critical/final/debug failures', includesAll(retention, [
  'isCriticalTrackingFailure',
  'classifyTrackingFailure',
  "'DEBUG_NON_CRITICAL'",
  "'FINAL_RETRYABLE'",
  "'CRITICAL'",
  'META_ENV_MISSING',
  'GA4_ENV_MISSING',
  'access token',
]));
expect('failure-retention helper implements dry-run cleanup with safe batch limit', includesAll(retention, [
  'runTrackingFailureCleanup',
  'dryRun',
  'buildTrackingFailureCleanupWhere',
  'cleanupAfter',
  'deleteMany',
  'sample:',
]));

for (const file of [
  'lib/tracking/meta-capi-cod-purchase.ts',
  'lib/tracking/meta-capi-core-event.ts',
  'lib/tracking/ga4-measurement-protocol.ts',
]) {
  const text = read(file);
  expect(`${file} stamps failure category and cleanup date on failure logs`, includesAll(text, [
    'getTrackingFailureLogRetentionMetadata',
    'failureCategory: retention.failureCategory',
    'cleanupAfter: retention.cleanupAfter',
  ]));
}

const cronRoute = read('app/api/cron/tracking-cleanup/route.ts');
expect('tracking cleanup cron route exists and requires secret in production', includesAll(cronRoute, [
  'TRACKING_CLEANUP_CRON_SECRET',
  'TRACKING_HEALTH_CRON_SECRET',
  'authorizeSharedSecretRequest',
  'x-cron-secret',
  'allowWhenUnconfiguredInNonProduction',
  'runTrackingFailureCleanup',
  'dryRun',
]));
expect('tracking cleanup CLI script exists', exists('scripts/tracking-cleanup-cron.ts') && includesAll(read('scripts/tracking-cleanup-cron.ts'), [
  'runTrackingFailureCleanup',
  '--dry-run',
  '--limit=',
]));

const health = read('lib/tracking/health.ts');
expect('tracking health API exposes safe payload and retention fields', includesAll(health, [
  'failureCategory',
  'cleanupAfter',
  'lastRetryAt',
  'resolvedAt',
  'safePayload',
]));

const adminRoute = read('app/api/admin/tracking-health/route.ts');
expect('admin tracking-health exposes retention config and cleanup action', includesAll(adminRoute, [
  'getTrackingFailureRetentionConfig',
  'runTrackingFailureCleanup',
  "action === 'cleanup_failures'",
  'const dryRun = body.dryRun !== false',
]));
expect('admin retry remains duplicate-safe and skips test/internal orders', includesAll(adminRoute, [
  'order.isTest',
  'Test/internal orders are not retried',
  '!order.metaPurchaseSent',
  '!order.gaPurchaseSent',
  'lastRetryAt: new Date()',
]));

const adminPage = read('app/admin/tracking-health/page.tsx');
expect('tracking-health UI displays retention policy, cleanup controls, and safe payload only', includesAll(adminPage, [
  'Failure retention policy',
  'Dry-run Cleanup',
  'Cleanup Old Logs',
  'Safe payload summary',
  'failure.safePayload',
  'failure.failureCategory',
]));

const envExample = read('.env.example');
for (const token of [
  'TRACKING_CLEANUP_CRON_SECRET=',
  'TRACKING_FAILURE_DEBUG_RETENTION_DAYS=30',
  'TRACKING_FAILURE_FINAL_RETENTION_DAYS=90',
  'TRACKING_FAILURE_CRITICAL_RETENTION_DAYS=180',
  'TRACKING_FAILURE_CLEANUP_LIMIT=1000',
]) {
  expect(`.env.example contains ${token}`, envExample.includes(token));
}

const envAudit = read('scripts/tracking-env-audit.mjs');
expect('tracking env audit checks cleanup cron secret', includesAll(envAudit, [
  'TRACKING_CLEANUP_CRON_SECRET_MISSING',
  'TRACKING_CLEANUP_CRON_SECRET_READY',
  'TRACKING_CLEANUP_CRON_SECRET_WEAK',
]));

const docs = read('docs/production/tracking-failure-ops.md');
expect('failure ops docs cover retention, dry-run, cron, retry safety, and no PII', includesAll(docs, [
  'Phase 16',
  '30 days',
  '90 days',
  '180 days',
  '/api/cron/tracking-cleanup',
  'dryRun',
  'Safe payload',
  'No raw email',
]));

const packageJson = JSON.parse(read('package.json') || '{}');
expect('package scripts expose Phase 16 QA and cleanup cron', packageJson.scripts?.['qa:tracking-retention'] === 'node scripts/tracking-retention-audit.mjs' && packageJson.scripts?.['qa:phase16'] === 'node scripts/tracking-retention-audit.mjs' && packageJson.scripts?.['cron:tracking-cleanup'] === 'tsx scripts/tracking-cleanup-cron.ts');
expect('qa:predeploy includes qa:phase16', packageJson.scripts?.['qa:predeploy']?.includes('qa:phase16'));

const report = read('PHASE16_TRACKING_FAILURE_RETENTION_OPS.md');
expect('Phase 16 delivery report exists', includesAll(report, ['Phase 16', 'Failure Retention', 'Dead Letter', 'QA']));

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
