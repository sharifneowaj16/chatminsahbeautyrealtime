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
const job = read('lib/meta-platform/queue/lead-processing-job.ts');
const queueIndex = read('lib/meta-platform/queue/index.ts');
const handoff = read('lib/meta/leads/handoff.ts');
const service = read('lib/meta/leads/service.ts');
const domainService = read('lib/meta-platform/domains/leads/runtime.ts');
const legacyService = read('lib/meta/leads/legacy-service.ts');
const processingService = `${service}\n${domainService}\n${legacyService}`;
const worker = read('workers/meta-lead.worker.ts');
const repository = read('lib/meta-platform/repositories/prisma-leads.ts');
const evidence = read('evidence/phase31-meta-social-crm/04-queue-jobs.md');

check('Layer 4.3 source test audit and evidence files exist', [
  'lib/meta-platform/queue/lead-processing-job.ts',
  'tests/meta-v6/phase31-lead-processing-job.test.mjs',
  'scripts/meta-platform-phase31-layer4.3-lead-job-audit.mjs',
  'evidence/phase31-meta-social-crm/04-queue-jobs.md',
].every(exists));
check('Lead job module is exported through the queue boundary', includesAll(queueIndex, [
  'buildMetaLeadProcessingDedupeKey', 'createMetaLeadProcessingJobEnvelope',
  'enqueueMetaLeadProcessingJob', 'executeMetaLeadProcessingJob',
]));
check('Lead producer uses canonical PROCESS_META_LEAD envelope', includesAll(job, [
  "jobType: 'PROCESS_META_LEAD'", "kind: 'WEBHOOK_RECEIPT'",
  "component: 'meta-social-lead-worker'", "operation: 'process-meta-lead'",
]));
check('Lead dedupe key is deterministic and namespaced', includesAll(job, [
  "createHash('sha256')", "return `social:process-meta-lead:${digest}`",
]));
check('Lead envelope carries only durable references and bounded scope IDs', includesAll(job, [
  'receiptId', 'providerLeadId', 'pageId', 'formId', 'payloadRef',
]) && !/accessToken|field_data|rawPayload|normalizedData|email:|phone:/.test(job));
check('webhook handoff uses shared social queue adapter instead of legacy direct enqueue', includesAll(handoff, [
  'createDefaultMetaSocialQueueAdapter', 'enqueueMetaLeadProcessingJob',
  'queued.envelope.dedupeKey', "code: 'QUEUE_HANDOFF_FAILED'",
]) && !handoff.includes('enqueueMetaLeadFetchJob'));
check('queue deferred or rejected results do not falsely mark receipt queued', handoff.indexOf('if (!queued.result.accepted)') < handoff.indexOf('const canonicalQueued = await markMetaSocialWebhookReceiptQueued'));
check('Lead handler validates canonical job and durable receipt reference before execution', includesAll(job, [
  "claim.envelope.jobType !== 'PROCESS_META_LEAD'", "payloadRef.kind !== 'WEBHOOK_RECEIPT'",
  'payloadRef.id !== receiptId', 'META_LEAD_JOB_REFERENCE_INVALID',
]));
check('Lead handler passes receipt provider Page and Form IDs into existing processor', includesAll(job, [
  'processReceipt({', 'receiptId,', 'leadgenId: payloadRef.providerObjectId',
  'pageId: payloadRef.scope.pageId', 'formId: payloadRef.scope.formId',
]));
check('successful and duplicate-safe processing ACK the queue job', includesAll(job, [
  "outcome: 'ACK'", 'ackMetaSocialQueueJob', "kind: 'WEBHOOK_RECEIPT'",
]));
check('failure taxonomy includes rate limit transient auth policy and permanent classes', [
  "classification: 'RATE_LIMIT'", "classification: 'TRANSIENT'", "classification: 'AUTH'",
  "classification: 'POLICY_BLOCKED'", "classification: 'PERMANENT'",
].every((value) => job.includes(value)));
check('Retry-After is preserved only for retryable Lead failures', includesAll(job, [
  'extractRetryAfterMs', 'retryAfterMs', 'nackMetaSocialQueueJob(failure)',
]));
check('existing Lead service claims canonical receipt lease and rejects concurrent claims', includesAll(processingService, [
  'claimMetaSocialWebhookReceipt', 'leaseToken', 'META_SOCIAL_WEBHOOK_RECEIPT_NOT_CLAIMABLE',
]));
check('existing Lead service resolves Page/Form identity and fetches full provider Lead', includesAll(processingService, [
  'fetchMetaLeadGraphRecord', 'ensureMetaLeadStorageIdentities',
  'META_LEAD_FORM_OWNERSHIP_MISMATCH',
]));
check('existing Lead service normalizes encrypts persists and hands off idempotently', includesAll(processingService + repository, [
  'normalizeMetaLeadFields', 'encryptMetaLeadPayload', 'persistNormalizedMetaLeadStorage',
  'buildMetaLeadHandoffIdempotencyKey', 'assignMetaLead',
]));
check('existing Lead service marks receipt processed after durable Lead persistence', domainService.indexOf('const persisted = await persistNormalizedMetaLeadStorage') < domainService.indexOf('const canonicalProcessed = await markMetaSocialWebhookReceiptProcessed'));
check('permanent Lead failures converge canonical receipt to dead letter', includesAll(processingService, [
  'markMetaSocialWebhookReceiptFailed', 'if (permanent)', 'markMetaSocialWebhookReceiptDeadLettered',
]));
check('Lead worker claims canonical envelope and preserves legacy queued-job compatibility', includesAll(worker, [
  'if (!data.socialEnvelope) return processMetaLeadReceipt(data)',
  'claimBullMqSocialJob', 'executeMetaLeadProcessingJob',
]));
check('Lead worker retries retryable NACKs and dead-letters permanent or exhausted attempts', includesAll(worker, [
  'decideMetaSocialJobFailure', "decision.action !== 'RETRY'", 'deadLetterLeadReceipt',
  'createMetaSocialRetryError', 'UnrecoverableError',
]));
check('Lead receipt recovery now enqueues canonical envelopes', includesAll(worker, [
  "job.name === META_JOB_NAMES.LEAD_RECEIPT_RECOVERY", 'enqueueMetaLeadProcessingJob',
  'canonical.environment', 'canonical.connectionKey',
]));
check('Layer 4.3 is schema-free', sha256(schema) === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check('Layer 4.3 package scripts are registered', pkg.scripts?.['test:meta-v6-phase31-layer4.3'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-lead-processing-job.test.mjs'
  && pkg.scripts?.['qa:meta-platform-phase31-layer4.3'] === 'node scripts/meta-platform-phase31-layer4.3-lead-job-audit.mjs'
  && pkg.scripts?.['qa:phase31-meta-layer4.3'] === 'npm run test:meta-v6-phase31-layer4.3 && npm run qa:meta-platform-phase31-layer4.3 && npm run qa:meta-platform-inventory');
check('item report records completion and exact Layer 4.4 next item', includesAll(evidence, [
  'Item: 4.3', 'Status: COMPLETE', 'Schema: unchanged', 'Layer 4.4 — Instagram inbound message job',
]));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 Layer 4.3 Lead processing job audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
