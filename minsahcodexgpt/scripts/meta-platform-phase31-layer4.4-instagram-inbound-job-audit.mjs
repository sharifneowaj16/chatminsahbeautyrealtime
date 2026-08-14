#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const includesAll = (source, values) => values.every((value) => source.includes(value));
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const job = read('lib/meta-platform/queue/instagram-inbound-job.ts');
const attachmentJob = read('lib/meta-platform/queue/social-attachment-validation-job.ts');
const realtimeEvent = read('lib/meta-platform/queue/instagram-inbound-event.ts');
const queueIndex = read('lib/meta-platform/queue/index.ts');
const service = read('lib/meta/instagram/service.ts');
const processor = read('lib/meta/instagram/messages.ts');
const realtimePublisher = read('lib/meta/instagram/realtime.ts');
const sharedRealtimePublisher = read('lib/meta-platform/realtime/social-events.ts');
const worker = read('workers/meta-instagram.worker.ts');
const repository = read('lib/meta-platform/repositories/prisma-instagram-persistence.ts');
const evidence = read('evidence/phase31-meta-social-crm/04-queue-jobs.md');

check('Layer 4.4 implementation, test, audit and evidence files exist', [
  'lib/meta-platform/queue/instagram-inbound-job.ts',
  'lib/meta-platform/queue/social-attachment-validation-job.ts',
  'lib/meta-platform/queue/instagram-inbound-event.ts',
  'lib/meta/instagram/realtime.ts',
  'tests/meta-v6/phase31-instagram-inbound-job.test.mjs',
  'scripts/meta-platform-phase31-layer4.4-instagram-inbound-job-audit.mjs',
  'evidence/phase31-meta-social-crm/04-queue-jobs.md',
].every(exists));
check('Instagram inbound job is exported through the shared queue boundary', includesAll(queueIndex, [
  'buildMetaInstagramInboundDedupeKey', 'createMetaInstagramInboundJobEnvelope',
  'enqueueMetaInstagramInboundJob', 'executeMetaInstagramInboundJob',
  'createMetaInstagramInboundRealtimeEvent', 'enqueueMetaSocialAttachmentValidationJob',
]));
check('Instagram inbound producer creates the canonical durable receipt envelope', includesAll(job, [
  "jobType: 'PROCESS_INSTAGRAM_INBOUND'", "kind: 'WEBHOOK_RECEIPT'",
  "component: 'meta-social-instagram-worker'", "operation: 'process-instagram-inbound'",
]));
check('Instagram inbound dedupe is deterministic and namespaced', includesAll(job, [
  "createHash('sha256')", 'social:process-instagram-inbound:',
]));
check('Instagram webhook handoff uses the shared adapter and canonical producer', includesAll(service, [
  'createDefaultMetaSocialQueueAdapter', 'enqueueMetaInstagramInboundJob',
  'providerMessageId: event.platformMessageId', 'jobReference: queued.envelope.dedupeKey',
]) && !service.includes('enqueueMetaInstagramMessageJob'));
check('Canonical handoff defers safely when queue enqueue is unavailable', includesAll(service, [
  "disposition: 'DEFERRED'", "code: 'QUEUE_HANDOFF_FAILED'", "status: 'FAILED'",
]));
check('Instagram worker claims canonical BullMQ envelopes and executes the shared handler', includesAll(worker, [
  'claimBullMqSocialJob', 'executeMetaInstagramInboundJob', 'data.socialEnvelope',
  'expectedProviderMessageId: providerMessageId', 'expectedAccountId: accountId',
]));
check('Already queued legacy Instagram payloads remain processable', includesAll(worker, [
  'if (!data.socialEnvelope)', 'processInstagramWebhookReceipt(data.receiptId',
]));
check('Receipt processing uses canonical lease claim and guarded completion', includesAll(processor, [
  'claimMetaSocialWebhookReceipt', 'leaseToken: canonicalLease',
  'markMetaSocialWebhookReceiptProcessed', 'markMetaSocialWebhookReceiptFailed',
]));
check('Envelope provider/account scope is verified against the normalized durable event', includesAll(processor, [
  'expectedProviderMessageId', 'INSTAGRAM_INBOUND_PROVIDER_MESSAGE_MISMATCH',
  'expectedAccountId', 'INSTAGRAM_INBOUND_ACCOUNT_SCOPE_MISMATCH',
]));
check('Provider account identity is required before conversation/message persistence', includesAll(repository, [
  'primaryIdentityReferenceId', 'INSTAGRAM_ACCOUNT_IDENTITY_REQUIRED',
  'INSTAGRAM_CONVERSATION_ACCOUNT_MISMATCH', 'INSTAGRAM_CONVERSATION_PARTICIPANT_MISMATCH',
]));
check('Inbound message storage is DB-idempotent by scoped provider message ID', includesAll(repository, [
  'ON CONFLICT ("environment","connectionKey","accountIdentityReferenceId","providerMessageId")',
  'digestMismatchCount', 'INSTAGRAM_RECEIPT_MESSAGE_LINK_CONFLICT',
]));
check('Conversation ordering advances only for a newly created latest event', includesAll(repository, [
  'let orderingAdvanced = false', 'orderingUpdates === 1',
  '"lastActivityAt" IS NULL OR $2 > "lastActivityAt"',
  'orderingVersion"="orderingVersion"+1',
]));
check('Out-of-order result is explicitly projected for queue and realtime consumers', includesAll(processor, [
  'persisted.created && !persisted.orderingAdvanced', 'outOfOrder:',
]));
check('Inbound media is persisted then queued for validation rather than downloaded inline', includesAll(processor, [
  'scheduleAttachmentValidation', 'persistInstagramAttachmentPolicyStorage',
  "decision: 'PENDING'", 'validationJobReference',
]) && !processor.includes('downloadInstagramAttachment'));
check('Attachment validation envelope contains only durable IDs and a URL digest', includesAll(attachmentJob, [
  "jobType: 'VALIDATE_SOCIAL_ATTACHMENT'", "kind: 'SOCIAL_ATTACHMENT'",
  'sourceDigest', 'messageId', 'conversationId', 'accountId',
]) && !/sourceUrl|accessToken|messageText|rawPayload/.test(attachmentJob));
check('Worker schedules attachment validation through the shared social queue adapter', includesAll(worker, [
  'enqueueMetaSocialAttachmentValidationJob', 'sourceDigest: input.sourceDigest',
  'jobReference: queued.envelope.dedupeKey',
]));
check('Realtime event has deterministic identity and safe normalized state only', includesAll(realtimeEvent, [
  "type: 'INSTAGRAM_MESSAGE_UPSERTED'", "createHash('sha256')",
  'receiptId', 'conversationId', 'messageId', 'providerMessageId',
  'deduplicated', 'outOfOrder',
]) && !/messageText|participantName|participantUsername|email|phone|sourceUrl/.test(realtimeEvent));
check('Main app publishes normalized Instagram events through the shared social update publisher', includesAll(realtimePublisher, [
  'publishNormalizedSocialRealtimeEvent', 'publishMetaInstagramInboundRealtimeEvent',
]) && includesAll(sharedRealtimePublisher, [
  'parseSocialRealtimeEvent', 'publishSocialUpdate', 'publishNormalizedSocialRealtimeEvent',
]));
check('Realtime publication happens before terminal receipt completion', processor.indexOf('emitRealtimeEvent') >= 0
  && processor.indexOf('emitRealtimeEvent') < processor.indexOf("status: 'PROCESSED'"));
check('Failure taxonomy distinguishes retryable, auth, policy and permanent Instagram failures', includesAll(job, [
  "classification: 'RATE_LIMIT'", "classification: 'TRANSIENT'", "classification: 'AUTH'",
  "classification: 'POLICY_BLOCKED'", "classification: 'PERMANENT'",
]));
check('Permanent and exhausted Instagram jobs converge on canonical receipt dead-letter', includesAll(worker, [
  'markMetaSocialWebhookReceiptDeadLettered', 'decideMetaSocialJobFailure',
  "decision.action !== 'RETRY'", 'INSTAGRAM_INBOUND_RETRY_EXHAUSTED',
]));
check('Queue payload source contains no token, raw webhook payload, PII or media URL fields', !/accessToken|pageAccessToken|rawPayload|normalizedEvent|messageText|participantName|participantUsername|sourceUrl/.test(job + attachmentJob));
check('Layer 4.4 package scripts are registered', pkg.scripts?.['test:meta-v6-phase31-layer4.4'] === 'node --experimental-strip-types --test tests/meta-v6/phase31-instagram-inbound-job.test.mjs'
  && pkg.scripts?.['qa:meta-platform-phase31-layer4.4'] === 'node scripts/meta-platform-phase31-layer4.4-instagram-inbound-job-audit.mjs'
  && pkg.scripts?.['qa:phase31-meta-layer4.4'] === 'npm run test:meta-v6-phase31-layer4.4 && npm run qa:meta-platform-phase31-layer4.4 && npm run qa:meta-platform-inventory');
check('Layer 4 evidence records 4.4 completion and the exact next item', includesAll(evidence, [
  'Item: 4.4 — Instagram inbound message job', '**Status: COMPLETE**',
  'Layer 4.5 — Instagram reply and private-reply jobs',
]));
check('No new Layer 4.4 Prisma model or enum was introduced', !/Layer44|InstagramInboundJob|SocialAttachmentJob/.test(schema));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const passed = checks.filter((item) => item.ok).length;
console.log(`\nPhase 31 Layer 4.4 Instagram inbound job audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
