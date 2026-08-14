#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const includesAll = (source, values) => values.every((value) => source.includes(value));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const schema = read('prisma/schema.prisma');
const pkg = JSON.parse(read('package.json'));
const jobTypes = read('lib/jobs/job-types.ts');
const worker = read('lib/jobs/worker.ts');
const socialTypes = read('lib/meta-platform/queue/social-job-types.ts');
const envelope = read('lib/meta-platform/queue/social-job-envelope.ts');
const contract = read('lib/meta-platform/queue/social-queue-adapter.ts');
const adapter = read('lib/meta-platform/queue/bullmq-social-adapter.ts');
const evidence = read('evidence/phase31-meta-social-crm/04-queue-jobs.md');

check('all Layer 4.2 source files exist', [
  'lib/meta-platform/queue/social-job-types.ts',
  'lib/meta-platform/queue/social-job-envelope.ts',
  'lib/meta-platform/queue/social-queue-adapter.ts',
  'lib/meta-platform/queue/bullmq-social-adapter.ts',
  'lib/meta-platform/queue/index.ts',
  'tests/meta-v6/phase31-social-queue-contract.test.mjs',
].every(exists));
check('eight canonical job types are defined', [
  'PROCESS_META_LEAD', 'PROCESS_INSTAGRAM_INBOUND', 'SEND_INSTAGRAM_REPLY',
  'SEND_INSTAGRAM_PRIVATE_REPLY', 'VALIDATE_SOCIAL_ATTACHMENT', 'REPLAY_SOCIAL_EVENT',
  'SYNC_FACEBOOK_PAGE_INBOX', 'REFRESH_META_PERMISSION_HEALTH',
].every((value) => socialTypes.includes(value)));
check('versioned envelope includes all required fields', includesAll(socialTypes + envelope, [
  'schemaVersion', 'jobType', 'receiptId', 'attemptNumber', 'correlationId',
  'scheduledAt', 'dedupeKey', 'payloadRef', 'observability',
]));
check('envelope is bounded and canonical dedupe is namespaced', includesAll(envelope + socialTypes, [
  'META_SOCIAL_JOB_ENVELOPE_MAX_BYTES = 8 * 1024',
  'metaSocialJobDedupePrefix',
  'SOCIAL_JOB_DEDUPE_NAMESPACE_INVALID',
]));
check('safe payload references prohibit secrets PII text and URLs', includesAll(envelope, [
  'SOCIAL_JOB_SECRET_OR_PII_FIELD_FORBIDDEN',
  'SOCIAL_JOB_URL_VALUE_FORBIDDEN',
  'Secrets, raw payloads, message text, PII and URLs are forbidden',
]));
check('claim ack and nack contracts exist', includesAll(contract, [
  'MetaSocialQueueTransportClaim', 'MetaSocialQueueAck', 'MetaSocialQueueNack',
  'createMetaSocialQueueClaim', 'ackMetaSocialQueueJob', 'nackMetaSocialQueueJob',
]));
check('unknown-write nacks require reconciliation and are not blind-retried', includesAll(contract, [
  "input.classification === 'UNKNOWN_WRITE'",
  "const retryable = input.classification === 'RATE_LIMIT' || input.classification === 'TRANSIENT'",
]));
check('BullMQ adapter maps existing Lead Instagram and permission-health jobs compatibly', includesAll(adapter, [
  'META_JOB_NAMES.LEAD_FETCH', 'META_JOB_NAMES.INSTAGRAM_MESSAGE', 'META_JOB_NAMES.CONNECTION_HEALTH',
  "compatibility: 'EXISTING'",
]));
check('missing social jobs are additive and queue-routable', includesAll(jobTypes + adapter, [
  "SOCIAL: 'meta-social'", "INSTAGRAM_REPLY: 'instagram-reply'",
  "INSTAGRAM_PRIVATE_REPLY: 'instagram-private-reply'",
  "SOCIAL_ATTACHMENT_VALIDATION: 'social-attachment-validation'",
  "SOCIAL_EVENT_REPLAY: 'social-event-replay'",
  "FACEBOOK_PAGE_INBOX_SYNC: 'facebook-page-inbox-sync'",
]));
check('mapped payloads preserve canonical envelope and shared validation', includesAll(adapter + jobTypes, [
  'socialEnvelope: envelope', 'validateMetaJobPayload', 'validateSocialTransportEnvelope',
  'SOCIAL_ENVELOPE_DEDUPE_MISMATCH', 'SOCIAL_ENVELOPE_CORRELATION_MISMATCH',
]));
check('scheduled timestamps map to BullMQ delay options', includesAll(adapter, [
  'new Date(envelope.scheduledAt).getTime() - now.getTime()',
  'options: Object.freeze({ delay })',
]));
check('queue outage becomes a durable recoverable deferred result', includesAll(adapter, [
  'isMetaSocialQueueUnavailableError', "outcome: 'DEFERRED'", "code: 'SOCIAL_QUEUE_UNAVAILABLE'",
  'recoverable: true', 'retryAt:',
]));
check('unrelated programming errors are rethrown', adapter.includes("if (!isMetaSocialQueueUnavailableError(error)) throw error"));
check('shared worker has runtime policy for additive social queue', worker.includes('[META_QUEUE_NAMES.SOCIAL]'));
check('no raw message or URL fields are defined in the canonical payload reference', !/\bmessageText\??:|\bsourceUrl\??:|\bmediaUrl\??:|\baccessToken\??:/.test(socialTypes));
check('Layer 4.2 is schema-free', sha256(schema) === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check('Layer 4.2 scripts are registered', pkg.scripts?.['test:meta-v6-phase31-layer4.2'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-social-queue-contract.test.mjs'
  && pkg.scripts?.['qa:meta-platform-phase31-layer4.2'] === 'node scripts/meta-platform-phase31-layer4.2-queue-contract-audit.mjs'
  && pkg.scripts?.['qa:phase31-meta-layer4.2'] === 'npm run test:meta-v6-phase31-layer4.2 && npm run qa:meta-platform-phase31-layer4.2 && npm run qa:meta-platform-inventory');
check('concise item report records exact next item', includesAll(evidence, [
  'Item: 4.2', 'Status: COMPLETE', 'Schema: unchanged', 'Layer 4.3',
]));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 31 Layer 4.2 shared social queue contract audit: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length > 0) process.exit(1);
