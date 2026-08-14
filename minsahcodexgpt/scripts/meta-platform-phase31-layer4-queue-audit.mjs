#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const includesAll = (source, values) => values.every((value) => source.includes(value));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const jobTypes = read('lib/jobs/job-types.ts');
const queues = read('lib/jobs/queues.ts');
const auditRepository = read('lib/jobs/audit-repository.ts');
const retryPolicy = read('lib/jobs/retry-policy.ts');
const worker = read('lib/jobs/worker.ts');
const scheduler = read('lib/jobs/scheduler.ts');
const deadLetter = read('lib/jobs/dead-letter.ts');
const leadHandoff = read('lib/meta/leads/handoff.ts');
const instagramHandoff = read('lib/meta/instagram/service.ts');
const leadWorker = read('workers/meta-lead.worker.ts');
const instagramWorker = read('workers/meta-instagram.worker.ts');
const schedulerWorker = read('workers/meta-scheduler.worker.ts');
const instrumentation = read('instrumentation.ts');
const entrypoint = read('docker-entrypoint.sh');
const realtimeOutgoing = read('realtime-service/src/facebook/outgoing-retry.ts');
const realtimeMedia = read('realtime-service/src/facebook/media-retry.ts');
const realtimeReplay = read('realtime-service/src/facebook/replay-queue.ts');
const realtimeIndex = read('realtime-service/src/index.ts');
const realtimeWebhook = read('realtime-service/src/routes/webhook.router.ts');
const realtimeApp = read('realtime-service/src/app.ts');
const realtimeBridgeWebhook = read('realtime-service/src/routes/bridge-webhook.router.ts');
const mainFacebookWebhook = read('app/api/webhook/facebook/route.ts');
const mainSchema = schema;
const realtimeSchema = read('realtime-service/prisma/schema.prisma');
const evidencePath = 'evidence/phase31-meta-social-crm/04-queue-infrastructure-audit.md';
const evidence = read(evidencePath);

check('Layer 4.1 evidence and focused test exist', exists(evidencePath) && exists('tests/meta-v6/phase31-layer4-queue-audit.test.mjs'));
check('BullMQ and ioredis are the existing main queue provider', pkg.dependencies?.bullmq === '5.79.2' && pkg.dependencies?.ioredis === '5.10.1');
check('main queue inventory includes Lead Instagram and connection health queues', includesAll(jobTypes, [
  "LEADS: 'meta-leads'", "INSTAGRAM: 'meta-instagram'", "CONNECTION_HEALTH: 'meta-connection-health'",
]));
check('job envelope is versioned bounded and rejects secrets/PII/raw payloads', includesAll(jobTypes, [
  'META_JOB_SCHEMA_VERSION = 1', 'META_JOB_MAX_PAYLOAD_BYTES = 32 * 1024', 'SECRET_IN_JOB_PAYLOAD',
  'access_token', 'email', 'phone', 'rawpayload',
]));
check('database audit reservation precedes Redis enqueue', queues.indexOf('reserveMetaJobAudit') > -1
  && queues.indexOf('queue.add(') > -1
  && queues.indexOf('reserveMetaJobAudit') < queues.indexOf('queue.add('));
check('Redis enqueue failure remains durably marked retrying', includesAll(queues, [
  "status: 'RETRYING'", "code: 'REDIS_ENQUEUE_FAILED'", 'nextRunAt: new Date(Date.now() + 60_000)',
]));
check('MetaJobAudit provides unique idempotency and due-time lookup fields', includesAll(mainSchema + auditRepository, [
  'idempotencyKey   String        @unique', '@@index([nextRunAt])', 'ON CONFLICT ("idempotencyKey") DO NOTHING',
]));
check('Lead receipt-first handoff has queue failure deferral and scheduled recovery', includesAll(leadHandoff + leadWorker + scheduler, [
  'await createVerifiedMetaWebhookReceipt', "code: 'QUEUE_HANDOFF_FAILED'",
  'runMetaLeadReceiptRecovery', 'lead-receipt-recovery-5m',
]) && (leadHandoff.includes('await enqueueMetaLeadFetchJob') || leadHandoff.includes('await enqueueMetaLeadProcessingJob')));
check('Instagram receipt-first handoff and inbound worker are present', includesAll(instagramHandoff + instagramWorker, [
  'persistInstagramWebhookReceipt', "code: 'QUEUE_HANDOFF_FAILED'",
  'processInstagramWebhookReceipt(data.receiptId',
]) && (instagramHandoff.includes('enqueueMetaInstagramMessageJob') || instagramHandoff.includes('enqueueMetaInstagramInboundJob'))
  && (instagramWorker.includes('executeMetaInstagramInboundJob') || instagramWorker.includes('processInstagramWebhookReceipt(data.receiptId)')));
check('Instagram deferred receipt recovery is now implemented without a generic MetaJobAudit sweeper', jobTypes.includes('INSTAGRAM_RECEIPT_RECOVERY')
  && scheduler.includes('instagram-receipt-recovery-5m')
  && !auditRepository.includes('REDIS_ENQUEUE_FAILED'));
check('retry schedule taxonomy and Retry-After support are present', includesAll(retryPolicy, [
  '60_000', '300_000', '900_000', '3_600_000', 'extractRetryAfterMs',
  "'RATE_LIMIT' | 'TRANSIENT' | 'AUTH' | 'PERMANENT'",
]));
check('shared worker has bounded timeout heartbeat and stalled-job handling', includesAll(worker, [
  'withTimeout', 'maxStalledCount: 2', 'stalledInterval: 30_000', 'meta:v6:worker:', 'BULLMQ_JOB_STALLED',
]));
check('central retry decision is not yet enforced by the shared worker', retryPolicy.includes('getMetaProviderRetryDecision')
  && !worker.includes('getMetaProviderRetryDecision')
  && !worker.includes('classifyMetaProviderError'));
check('generic main dead-letter replay foundation exists', includesAll(deadLetter, [
  "new Set(['DEAD_LETTER', 'FAILED', 'CANCELLED'])", 'createMetaSocialReplayJobEnvelope',
  'replayOfId: original.id', 'replayRequestAuditId',
]));
check('scheduler uses UTC and a single-process overlap guard', includesAll(scheduler + schedulerWorker, [
  'getUTCMinutes', 'getUTCHours', 'let running = false', 'SCHEDULER_ALREADY_RUNNING',
]));
check('standalone social worker scripts exist and worker:all includes them', includesAll(JSON.stringify(pkg.scripts), [
  'worker:meta-lead', 'worker:meta-instagram', 'worker:meta-scheduler', 'worker:meta-token-health',
]));
check('worker:all omits product-set worker and evidence records the gap', !pkg.scripts['worker:all'].includes('worker:meta-product-sets')
  && evidence.includes('`worker:all` omits the existing product-set worker'));
check('Next instrumentation embeds the Layer 4 social workers after the Layer 4.8 startup closure', includesAll(instrumentation, [
  'startMetaLeadWorker', 'startMetaInstagramWorker', 'startMetaSocialWorker', 'startMetaSchedulerWorker',
]));
check('entrypoint embedded-worker wording now matches the actual social startup', entrypoint.includes('embedded BullMQ workers')
  && includesAll(instrumentation, ['startMetaLeadWorker', 'startMetaInstagramWorker', 'startMetaSocialWorker', 'startMetaSchedulerWorker']));
check('realtime starts three independent retry/replay workers', includesAll(realtimeIndex, [
  'startFacebookMediaRetryWorker', 'startOutgoingRetryWorker', 'startFacebookReplayWorker',
]));
check('realtime custom queues use sorted sets and remove members before processing', [realtimeOutgoing, realtimeMedia, realtimeReplay].every((source) =>
  source.includes('zrangebyscore') && source.includes('zrem')
  && /const removed = await [A-Za-z]+Redis\.zrem[\s\S]{0,500}(?:jobs|claimed)\.push/.test(source)));
check('realtime custom queue identities are inventoried', includesAll(realtimeOutgoing + realtimeMedia + realtimeReplay, [
  'fb:outgoing:retry', 'fb:media:retry', 'fb:replay:queue',
]));
check('realtime has separate durable dead-letter storage', mainSchema.includes('model FbDeadLetterJob')
  && realtimeSchema.includes('model FbDeadLetterJob')
  && realtimeSchema.includes('dedupeKey       String'));
const legacyWebhookAcksBeforeLocalProcessing = realtimeWebhook.indexOf('res.status(200)') < realtimeWebhook.indexOf('void Promise.allSettled');
const platformWebhookUsesSignedMainAppHandoff = includesAll(realtimeApp, [
  'getRealtimeFacebookCutoverStatus',
  'legacyDirectClientEnabled',
  'realtimeBridgeEnabled',
  "app.use('/webhook', bridgeWebhookRouter)",
]) && includesAll(realtimeBridgeWebhook, [
  'forwardFacebookWebhookToMainApp',
  "const MAIN_APP_PATH = '/api/webhook/facebook'",
]) && includesAll(mainFacebookWebhook, [
  'verifyInternalRealtimeBridgeRequest',
  'requestFacebookInboxSyncProduction',
  'getMetaFacebookRealtimeCutoverStatus',
]);
check('realtime webhook authority is cutover-scoped: legacy ACK/local processing or signed main-app BullMQ handoff', legacyWebhookAcksBeforeLocalProcessing && platformWebhookUsesSignedMainAppHandoff);
check('all eight canonical Layer 4 jobs are mapped in evidence', [
  'PROCESS_META_LEAD', 'PROCESS_INSTAGRAM_INBOUND', 'SEND_INSTAGRAM_REPLY', 'SEND_INSTAGRAM_PRIVATE_REPLY',
  'VALIDATE_SOCIAL_ATTACHMENT', 'REPLAY_SOCIAL_EVENT', 'SYNC_FACEBOOK_PAGE_INBOX', 'REFRESH_META_PERMISSION_HEALTH',
].every((value) => evidence.includes(value)));
check('reuse decision and realtime ownership boundary are explicit', includesAll(evidence, [
  'Decision: REUSE', 'main application BullMQ only', 'existing realtime service remains temporary owner',
]));
check('exact Layer 4.2 file and scope boundary is documented', includesAll(evidence, [
  'lib/meta-platform/queue/social-job-types.ts', 'lib/meta-platform/queue/social-job-envelope.ts',
  'lib/meta-platform/queue/social-queue-adapter.ts', 'lib/meta-platform/queue/bullmq-social-adapter.ts',
  'Layer 4.2 — Shared social queue contract and adapter',
]));
check('Layer 4.1 does not alter Prisma schema', sha256(schema) === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check('Layer 4.1 package scripts are registered', pkg.scripts?.['test:meta-v6-phase31-layer4-queue-audit'] === 'node --test tests/meta-v6/phase31-layer4-queue-audit.test.mjs'
  && pkg.scripts?.['qa:meta-platform-phase31-layer4-queue-audit'] === 'node scripts/meta-platform-phase31-layer4-queue-audit.mjs'
  && pkg.scripts?.['qa:phase31-meta-layer4.1'] === 'npm run test:meta-v6-phase31-layer4-queue-audit && npm run qa:meta-platform-phase31-layer4-queue-audit && npm run qa:meta-platform-inventory');
check('completion report contains mandatory status fields', includesAll(evidence, [
  '## 19. What changed', '## 20. What did not change', '## 21. Prisma status',
  '## 22. Verification status', '## 23. Known blockers', '## 24. Exact next item',
]));

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
}
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 Layer 4.1 queue infrastructure audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
