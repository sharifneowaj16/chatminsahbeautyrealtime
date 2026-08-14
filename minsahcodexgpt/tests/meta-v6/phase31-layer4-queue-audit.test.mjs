import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const includesAll = (source, values) => values.every((value) => source.includes(value));

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const jobTypes = read('lib/jobs/job-types.ts');
const queues = read('lib/jobs/queues.ts');
const auditRepository = read('lib/jobs/audit-repository.ts');
const retryPolicy = read('lib/jobs/retry-policy.ts');
const worker = read('lib/jobs/worker.ts');
const scheduler = read('lib/jobs/scheduler.ts');
const leadWorker = read('workers/meta-lead.worker.ts');
const instagramWorker = read('workers/meta-instagram.worker.ts');
const instrumentation = read('instrumentation.ts');
const realtimeOutgoing = read('realtime-service/src/facebook/outgoing-retry.ts');
const realtimeMedia = read('realtime-service/src/facebook/media-retry.ts');
const realtimeReplay = read('realtime-service/src/facebook/replay-queue.ts');
const evidence = read('evidence/phase31-meta-social-crm/04-queue-infrastructure-audit.md');

test('existing BullMQ and Redis infrastructure is explicitly reused', () => {
  assert.equal(pkg.dependencies.bullmq, '5.79.2');
  assert.equal(pkg.dependencies.ioredis, '5.10.1');
  assert.match(evidence, /Decision: REUSE/);
  assert.match(evidence, /must not introduce Kafka, RabbitMQ, SQS/);
});

test('main queue contract validates safe bounded durable-reference payloads', () => {
  assert.match(jobTypes, /META_JOB_MAX_PAYLOAD_BYTES = 32 \* 1024/);
  assert.ok(includesAll(jobTypes, [
    "LEADS: 'meta-leads'",
    "INSTAGRAM: 'meta-instagram'",
    "CONNECTION_HEALTH: 'meta-connection-health'",
    'SECRET_IN_JOB_PAYLOAD',
    'rawpayload',
    'access_token',
  ]));
  assert.match(jobTypes, /receiptId: string/);
});

test('enqueue reserves durable audit before Redis and records Redis handoff failure', () => {
  assert.ok(queues.indexOf('reserveMetaJobAudit') < queues.indexOf('queue.add('));
  assert.ok(includesAll(queues, [
    "status: 'RETRYING'",
    "code: 'REDIS_ENQUEUE_FAILED'",
    'nextRunAt: new Date(Date.now() + 60_000)',
  ]));
  assert.ok(includesAll(auditRepository, [
    'ON CONFLICT ("idempotencyKey") DO NOTHING',
    '"nextRunAt"',
    '"externalJobId"',
  ]));
});

test('Lead and Instagram inbound consumers use the shared worker and durable receipt IDs', () => {
  assert.ok(includesAll(leadWorker, [
    'startMetaJobWorker(META_QUEUE_NAMES.LEADS',
    'META_JOB_NAMES.LEAD_FETCH',
    'processMetaLeadReceipt(data)',
    'META_JOB_NAMES.LEAD_RECEIPT_RECOVERY',
  ]));
  assert.ok(includesAll(instagramWorker, [
    'startMetaJobWorker(META_QUEUE_NAMES.INSTAGRAM',
    'META_JOB_NAMES.INSTAGRAM_MESSAGE',
    'processInstagramWebhookReceipt(data.receiptId',
  ]));
  assert.ok(instagramWorker.includes('executeMetaInstagramInboundJob') || instagramWorker.includes('processInstagramWebhookReceipt(data.receiptId)'));
});

test('retry, stalled-job and scheduler behavior is completely audited', () => {
  assert.ok(includesAll(retryPolicy, [
    '60_000',
    '300_000',
    '900_000',
    '3_600_000',
    'extractRetryAfterMs',
    "'RATE_LIMIT' | 'TRANSIENT' | 'AUTH' | 'PERMANENT'",
  ]));
  assert.ok(includesAll(worker, [
    'maxStalledCount: 2',
    'stalledInterval: 30_000',
    "status: finalAttempt ? 'DEAD_LETTER' : 'RETRYING'",
    'meta:v6:worker:',
  ]));
  assert.ok(includesAll(scheduler, [
    'lead-receipt-recovery-5m',
    'instagram-retention-daily',
    'getUTCMinutes',
    'getUTCHours',
  ]));
  assert.match(evidence, /Retry jitter: MISSING/);
  assert.match(evidence, /Instagram deferred receipt recovery: MISSING/);
  assert.match(jobTypes, /INSTAGRAM_RECEIPT_RECOVERY/);
  assert.match(scheduler, /instagram-receipt-recovery-5m/);
});

test('Layer 4.8 closes the single-container social worker startup gap', () => {
  assert.match(instrumentation, /startMetaLeadWorker/);
  assert.match(instrumentation, /startMetaInstagramWorker/);
  assert.match(instrumentation, /startMetaSocialWorker/);
  assert.match(instrumentation, /startMetaSchedulerWorker/);
  assert.match(pkg.scripts['worker:all'], /worker:meta-lead/);
  assert.match(pkg.scripts['worker:all'], /worker:meta-instagram/);
  assert.match(pkg.scripts['worker:all'], /worker:meta-social/);
  assert.match(pkg.scripts['worker:all'], /worker:meta-scheduler/);
  assert.doesNotMatch(pkg.scripts['worker:all'], /worker:meta-product-sets/);
  assert.match(evidence, /Production startup ownership for all social workers: NOT PROVEN BY ARCHIVE/);
});

test('realtime custom queues and remove-before-process crash gap are explicitly mapped', () => {
  assert.ok(includesAll(realtimeOutgoing, ["'fb:outgoing:retry'", 'zrangebyscore', 'zrem']));
  assert.ok(includesAll(realtimeMedia, ["'fb:media:retry'", 'zrangebyscore', 'zrem']));
  assert.ok(includesAll(realtimeReplay, ["'fb:replay:queue'", 'zrangebyscore', 'zrem']));
  assert.match(evidence, /process crash after `ZREM`/);
  assert.match(evidence, /embed message text and attachment\/source URLs/);
});

test('all required canonical Layer 4 job types and exact Layer 4.2 boundary are documented', () => {
  for (const job of [
    'PROCESS_META_LEAD',
    'PROCESS_INSTAGRAM_INBOUND',
    'SEND_INSTAGRAM_REPLY',
    'SEND_INSTAGRAM_PRIVATE_REPLY',
    'VALIDATE_SOCIAL_ATTACHMENT',
    'REPLAY_SOCIAL_EVENT',
    'SYNC_FACEBOOK_PAGE_INBOX',
    'REFRESH_META_PERMISSION_HEALTH',
  ]) {
    assert.match(evidence, new RegExp(job));
  }
  assert.ok(includesAll(evidence, [
    'lib/meta-platform/queue/social-job-types.ts',
    'lib/meta-platform/queue/social-job-envelope.ts',
    'lib/meta-platform/queue/social-queue-adapter.ts',
    'lib/meta-platform/queue/bullmq-social-adapter.ts',
    'Layer 4.2 — Shared social queue contract and adapter',
  ]));
});

test('Layer 4.1 remains audit-only with frozen Prisma schema', () => {
  assert.equal(sha256(schema), 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
  assert.match(evidence, /Actual schema change for 4\.1: NO/);
  assert.match(evidence, /Actual migration for 4\.1: NO/);
  assert.match(evidence, /No queue name or existing job name changed/);
});

test('package exposes deterministic Layer 4.1 source gates', () => {
  assert.equal(pkg.scripts['test:meta-v6-phase31-layer4-queue-audit'], 'node --test tests/meta-v6/phase31-layer4-queue-audit.test.mjs');
  assert.equal(pkg.scripts['qa:meta-platform-phase31-layer4-queue-audit'], 'node scripts/meta-platform-phase31-layer4-queue-audit.mjs');
  assert.equal(pkg.scripts['qa:phase31-meta-layer4.1'], 'npm run test:meta-v6-phase31-layer4-queue-audit && npm run qa:meta-platform-phase31-layer4-queue-audit && npm run qa:meta-platform-inventory');
});
