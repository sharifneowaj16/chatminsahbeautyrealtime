#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const includesAll = (source, values) => values.every((value) => source.includes(value));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const instrumentation = read('instrumentation.ts');
const sharedWorker = read('lib/jobs/worker.ts');
const queueAdapter = read('lib/meta-platform/queue/bullmq-social-adapter.ts');
const receiptStore = read('lib/meta-platform/repositories/webhook-receipts.ts');
const reliability = read('lib/meta-platform/queue/social-job-reliability.ts');
const replay = read('lib/meta-platform/queue/social-replay-job.ts');
const leadWorker = read('workers/meta-lead.worker.ts');
const instagramWorker = read('workers/meta-instagram.worker.ts');
const socialWorker = read('workers/meta-social.worker.ts');
const evidencePath = 'evidence/phase31-meta-social-crm/04-queue-jobs.md';
const evidence = read(evidencePath);
const gateTestPath = 'tests/meta-v6/phase31-layer4-worker-queue-gate.test.mjs';
const gateTest = read(gateTestPath);

check('Layer 4.8 focused test and evidence exist', exists(gateTestPath) && exists(evidencePath));
check('queue outage is recoverable and preserves canonical envelope', includesAll(queueAdapter, [
  "outcome: 'DEFERRED'", "code: 'SOCIAL_QUEUE_UNAVAILABLE'", 'retryAt:', 'envelope: validation.envelope',
]) && gateTest.includes('queue outage preserves the durable envelope'));
check('receipt lease reclaim and stale worker fencing are covered', includesAll(receiptStore, [
  "lastTransitionCode: reclaimed ? 'PROCESSING_RECLAIMED'", 'META_SOCIAL_WEBHOOK_LEASE_ACTIVE',
  'META_SOCIAL_WEBHOOK_LEASE_NOT_OWNED',
]) && gateTest.includes('worker crash recovery reclaims an expired receipt lease'));
check('shared BullMQ worker has stall recovery heartbeat and bounded lock', includesAll(sharedWorker, [
  'maxStalledCount: 2', 'stalledInterval: 30_000', 'lockDuration:', 'meta:v6:worker:', 'BULLMQ_JOB_STALLED',
]));
check('retry policy uses exponential backoff deterministic jitter and Retry-After', includesAll(reliability, [
  '2 ** Math.max(0, attempt - 1)', 'META_SOCIAL_RETRY_JITTER_RATIO', 'deterministicUnit',
  'Math.max(jittered, providerDelay)',
]));
check('retry exhaustion and permanent failures dead-letter', includesAll(reliability, [
  "action: 'DEAD_LETTER'", "safeReasonCode: attempt >= maxAttempts && retryable ? 'META_SOCIAL_RETRY_EXHAUSTED'",
]));
check('unknown writes are reconciliation-only with no retry schedule', includesAll(reliability, [
  "action: 'RECONCILE'", "classification: 'UNKNOWN_WRITE'", 'reconciliationRequired: true', 'retryDelayMs: null',
]));
check('approved replay is audited deduplicated and recursion-safe', includesAll(replay, [
  'buildMetaSocialReplayRequestDedupeKey', "original.jobName === 'social-event-replay'", 'replayOfId: original.id',
  'incrementReplayCount(original.id)', 'unknownOutcomeMarker(original.lastError)',
]));
check('Lead Instagram and social workers use centralized reliability decisions', [leadWorker, instagramWorker, socialWorker]
  .every((source) => source.includes('decideMetaSocialJobFailure')));
check('possible-success outbound writes are not blindly retried', includesAll(instagramWorker, [
  'decision.reconciliationRequired', "decision.action === 'RECONCILE'", "UnrecoverableError(`UNKNOWN_WRITE:",
]));
check('single-container startup embeds all Layer 4 workers', includesAll(instrumentation, [
  'startMetaLeadWorker', 'startMetaInstagramWorker', 'startMetaSocialWorker', 'startMetaSchedulerWorker',
  'minsahMetaLeadWorkerStarted', 'minsahMetaInstagramWorkerStarted', 'minsahMetaSocialWorkerStarted',
  'minsahMetaSchedulerWorkerStarted',
]));
check('dedicated worker mode remains explicit and complete', includesAll(pkg.scripts['worker:all'] ?? '', [
  'worker:meta-lead', 'worker:meta-instagram', 'worker:meta-social', 'worker:meta-scheduler',
]) && instrumentation.includes('DISABLE_EMBEDDED_WORKERS'));
check('Layer 4 gate covers every required evidence scenario', [
  'Queue unavailable', 'Worker crash', 'Lease reclaim', 'Retry', 'Dead letter', 'Replay',
  'Possible-success reconciliation', 'Job dedupe', 'Safe queue payload', 'Worker startup',
].every((value) => evidence.includes(value)));
check('all numbered Layer 4 scripts remain registered', [
  'qa:phase31-meta-layer4.1', 'qa:phase31-meta-layer4.2', 'qa:phase31-meta-layer4.3',
  'qa:phase31-meta-layer4.4', 'qa:phase31-meta-layer4.5', 'qa:phase31-meta-layer4.6',
  'qa:phase31-meta-layer4.7', 'qa:phase31-meta-layer4.8', 'qa:phase31-meta-layer4',
].every((key) => typeof pkg.scripts[key] === 'string'));
check('Layer 4.8 schema remains frozen', sha256(schema) === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check('Layer 4 evidence contains explicit verdict and next item', includesAll(evidence, [
  'Layer 4 status: PASS', 'Exact next item', 'Layer 5.1', 'Prisma schema: unchanged',
]));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 Layer 4.8 worker/queue gate audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
