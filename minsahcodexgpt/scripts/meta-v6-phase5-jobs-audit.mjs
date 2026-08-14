#!/usr/bin/env node
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260717030000_meta_v6_phase5_durable_jobs/migration.sql');
const types = read('lib/jobs/job-types.ts');
const queues = read('lib/jobs/queues.ts');
const retry = read('lib/jobs/retry-policy.ts');
const rate = read('lib/jobs/rate-limit.ts');
const worker = read('lib/jobs/worker.ts');
const scheduler = read('lib/jobs/scheduler.ts');
const audit = read('lib/jobs/audit-repository.ts');
const dlq = read('lib/jobs/dead-letter.ts');
const admin = read('app/api/admin/meta/jobs/route.ts');
const legacy = read('lib/queue/metaCapiQueue.ts');
const sender = read('lib/meta/capi/sender.ts');
const sdk = read('lib/tracking/meta-business-sdk.ts');

check('MetaJobStatus enum exists', schema.includes('enum MetaJobStatus'));
check('MetaJobAudit model exists', schema.includes('model MetaJobAudit'));
check('job idempotency is unique', schema.includes('idempotencyKey   String        @unique'));
check('migration creates job enum/table', migration.includes('CREATE TYPE "MetaJobStatus"') && migration.includes('CREATE TABLE "MetaJobAudit"'));
check('migration creates unique dedupe index', migration.includes('MetaJobAudit_idempotencyKey_key'));
for (const name of ['meta-capi-events','meta-catalog-sync','meta-catalog-status','meta-leads','meta-diagnostics','meta-connection-health']) {
  check(`isolated queue ${name}`, types.includes(name));
}
check('versioned payload contract', types.includes('META_JOB_SCHEMA_VERSION = 1'));
check('payload size limit', types.includes('META_JOB_MAX_PAYLOAD_BYTES'));
check('secret-bearing payloads rejected', types.includes('SECRET_IN_JOB_PAYLOAD') && types.includes('access_token'));
check('queue/job contract validation', types.includes('QUEUE_JOB_MISMATCH') && types.includes('PAYLOAD_JOB_MISMATCH'));
check('retry schedule immediate to one hour', ['0','60_000','300_000','900_000','3_600_000'].every((x) => retry.includes(x)));
check('provider error classification', retry.includes('RATE_LIMIT') && retry.includes('AUTH') && retry.includes('PERMANENT'));
check('distributed rate limiter Lua', rate.includes("redis.call('INCR'") && rate.includes('PEXPIRE'));
check('adaptive usage/retry-after cooldown', rate.includes('retry-after') && rate.includes('x-business-use-case-usage') && rate.includes('computeMetaAdaptiveCooldownMs'));
check('sender enforces cooldown and token permit', sender.includes('getMetaProviderCooldownMs') && sender.includes('acquireMetaRateLimitPermit'));
check('SDK captures provider response headers', sdk.includes('responseHeaders') && sdk.includes('response.headers.entries()'));
check('deterministic job IDs', queues.includes('buildMetaJobId'));
check('audit insert uses conflict dedupe', audit.includes('ON CONFLICT ("idempotencyKey") DO NOTHING'));
check('worker stalled recovery', worker.includes('maxStalledCount: 2') && worker.includes("worker.on('stalled'"));
check('worker heartbeat', worker.includes('meta:v6:worker:'));
check('worker timeout', worker.includes('META_JOB_TIMEOUT_'));
check('custom provider backoff', worker.includes('backoffStrategy: metaJobBackoffStrategy'));
check('scheduler includes 5m/15m/hour/night/day/week', ['batch-status-5m','inventory-15m','incremental-hourly','reconcile-nightly','token-permission-asset-daily','api-version-weekly','full-weekly'].every((x) => scheduler.includes(x)));
check('DLQ replay creates new audited job', dlq.includes('buildReplayIdempotencyKey') && dlq.includes('replayOfId'));
check('admin operations SUPER_ADMIN protected', admin.includes('requireSuperAdmin') && admin.includes("action === 'replay'") && admin.includes("action === 'cancel'"));
check('GA4 queue isolated', legacy.includes('analytics-ga4-events') && legacy.includes('ga4EventsQueue.add'));
check('TikTok queue isolated', legacy.includes('tiktok-events') && legacy.includes('tiktokEventsQueue.add'));
for (const file of ['workers/meta-catalog.worker.ts','workers/meta-batch-status.worker.ts','workers/meta-capi-sender.worker.ts','workers/meta-lead.worker.ts','workers/meta-diagnostics.worker.ts','workers/meta-token-health.worker.ts','workers/meta-scheduler.worker.ts']) {
  check(`worker exists ${file}`, exists(file));
}
for (const file of ['app/api/admin/meta/catalogs/sync/route.ts','app/api/internal/meta/catalog-sync/route.ts','app/api/internal/meta/catalog-batch-status/route.ts','app/api/webhooks/meta/route.ts']) {
  const source = read(file);
  check(`async producer route ${file}`, source.includes('enqueueMeta') && !/syncCatalogProducts|pollPendingCatalogBatches|fetchLeadById/.test(source));
}

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
console.log(`\nMeta v6 Phase 5 audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
