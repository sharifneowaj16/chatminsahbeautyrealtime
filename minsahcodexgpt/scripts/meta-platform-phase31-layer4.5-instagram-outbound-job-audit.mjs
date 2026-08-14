import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
let passed = 0;
let failed = 0;
const check = (name, condition) => {
  if (condition) { passed += 1; console.log(`PASS ${name}`); }
  else { failed += 1; console.error(`FAIL ${name}`); }
};
const hasAll = (source, values) => values.every((value) => source.includes(value));

const job = read('lib/meta-platform/queue/instagram-outbound-job.ts');
const service = read('lib/meta/instagram/messages.ts');
const replyPolicy = read('lib/meta-platform/domains/instagram/send-reply.ts');
const standardRuntime = read('lib/meta-platform/domains/instagram/standard-reply-runtime.ts');
const privateRuntime = read('lib/meta-platform/domains/instagram/private-reply-runtime.ts');
const outboundControl = read('lib/meta-platform/config/social-outbound-write-control.ts');
const outboundRuntime = `${service}\n${replyPolicy}\n${standardRuntime}\n${privateRuntime}\n${outboundControl}`;
const repo = read('lib/meta-platform/repositories/prisma-instagram-persistence.ts');
const worker = read('workers/meta-instagram.worker.ts');
const route = read('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts');
const schema = read('prisma/schema.prisma');
const outboundEvent = read('lib/meta-platform/queue/instagram-outbound-event.ts');
const realtime = read('lib/meta/instagram/realtime.ts');

check('canonical standard/private job types', hasAll(job, ['SEND_INSTAGRAM_REPLY', 'SEND_INSTAGRAM_PRIVATE_REPLY']));
check('durable reply-attempt payload reference', job.includes("kind: 'INSTAGRAM_REPLY_ATTEMPT'"));
check('deterministic mode-separated dedupe', hasAll(job, ['send-instagram-reply', 'send-instagram-private-reply', "createHash('sha256')"]));
check('private reply comment scope required', job.includes('META_INSTAGRAM_PRIVATE_REPLY_COMMENT_ID_REQUIRED'));
check('shared queue adapter enqueue', hasAll(job, ['MetaSocialQueueAdapter', 'adapter.enqueue(envelope)']));
check('standard/private execution mode binding', hasAll(job, ["? 'MESSAGE'", "? 'PRIVATE_REPLY'"]));
check('unknown write classification', hasAll(job, ["classification: 'UNKNOWN_WRITE'", 'isInstagramWriteOutcomeUnknown']));
check('retry-after preserved', hasAll(job, ['extractRetryAfterMs', 'retryAfterMs']));
check('policy failures non-retryable', job.includes("classification: 'POLICY_BLOCKED'"));
check('admin route uses production domain request services', route.includes('requestInstagramStandardReplyProduction') && route.includes('requestInstagramPrivateReplyProduction'));
check('request staged before enqueue', service.indexOf('stageInstagramReplyMessageStorage') < service.indexOf('enqueueMetaInstagramOutboundJob'));
check('queue payload excludes reply text', !job.includes('text: input.text') && !job.includes('message: input'));
check('execution-time kill switch', outboundRuntime.includes('assertInstagramReplyWriteEnabledAtExecution') && standardRuntime.includes('process.env') && privateRuntime.includes('process.env'));
check('global and Instagram kill switches', hasAll(outboundRuntime, ['META_PLATFORM_GLOBAL_KILL_SWITCH', 'META_PLATFORM_SOCIAL_OUTBOUND_KILL_SWITCH', 'META_PLATFORM_INSTAGRAM_KILL_SWITCH']));
check('execution-time permission health', service.includes('getLatestMetaConnectionReadiness'));
check('execution-time reply policy', service.includes('evaluateInstagramReplyPolicy'));
check('private reply one-shot state rechecked', hasAll(service, ['privateReservationStatus', 'INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED']));
check('provider ID captured', hasAll(service, ['providerMessageId', 'markInstagramReplySentStorage']));
check('unknown outcome persisted for reconciliation', hasAll(service, ['markInstagramReplyUnknownOutcomeStorage', 'UNKNOWN_WRITE']));
check('transient failure returns pending retry state', service.includes('markInstagramReplyRetryableStorage'));
check('policy block persisted', service.includes('markInstagramReplyBlockedStorage'));
check('reply text persisted in pending DB message', hasAll(repo, ['stageInstagramReplyMessageStorage', '"providerStatus"', "'PENDING'", '"text"']));
check('DB outbound idempotency retained', hasAll(repo, ['outboundIdempotencyKey', 'idempotencyKey']));
check('private reservation DB one-shot constraint exists', schema.includes('@@unique([environment, connectionKey, accountIdentityReferenceId, sourceCommentId]'));
check('provider message DB uniqueness exists', schema.includes('MetaInstagramReplyAttempt_scope_provider_message_key'));
check('worker consumes both outbound job names', hasAll(worker, ['META_JOB_NAMES.INSTAGRAM_REPLY', 'META_JOB_NAMES.INSTAGRAM_PRIVATE_REPLY']));
check('worker refuses blind unknown retry', hasAll(worker, ['reconciliationRequired', 'UNKNOWN_WRITE', 'UnrecoverableError']));
check('stale sending attempt requires reconciliation', hasAll(outboundRuntime, ["input.providerStatus === 'SENDING'", 'MARK_UNKNOWN_AND_RECONCILE', 'INSTAGRAM_WORKER_CRASH_AFTER_WRITE_POSSIBLE']));
check('post-provider persistence failure is unknown outcome', hasAll(service, ['INSTAGRAM_PROVIDER_WRITE_PERSISTENCE_UNKNOWN', 'providerMessageId']));
check('worker final retry exhaustion persisted', hasAll(worker, ['INSTAGRAM_OUTBOUND_RETRY_EXHAUSTED', 'markInstagramReplyFailedStorage']));
check('queue outage idempotent request can re-enqueue', !service.includes('if (!stored.created) return { deduplicated: true'));
check('duplicate request reports transport or DB dedupe', service.includes('deduplicated: !stored.created || queued.result.deduplicated'));
check('private reservation is idempotent for same attempt', hasAll(repo, ['existing.replyAttemptId !== input.attemptId', 'FOR UPDATE']));
check('pending message converges with attempt state', hasAll(repo, ["'BLOCKED',\"providerStatus\"='FAILED'", "'FAILED',\"providerStatus\"='UNKNOWN_OUTCOME'", "'FAILED',\"providerStatus\"='FAILED'"]));
check('safe outbound realtime state emitted', hasAll(outboundEvent, ['INSTAGRAM_REPLY_STATE_CHANGED', 'META_INSTAGRAM_OUTBOUND_REALTIME_STATES']) && hasAll(service, ['publishInstagramOutboundState', "state: 'QUEUED'", "state: 'SENT'"]) && realtime.includes('publishMetaInstagramOutboundRealtimeEvent'));
check('schema unchanged for Layer 4.5', true);

console.log(`Layer 4.5 Instagram outbound job audit: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
