import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildMetaInstagramOutboundDedupeKey,
  classifyMetaInstagramOutboundFailure,
  createMetaInstagramOutboundJobEnvelope,
  enqueueMetaInstagramOutboundJob,
  executeMetaInstagramOutboundJob,
} from '../../lib/meta-platform/queue/instagram-outbound-job.ts';
import { createMetaInstagramOutboundRealtimeEvent } from '../../lib/meta-platform/queue/instagram-outbound-event.ts';
import { createMetaSocialQueueClaim } from '../../lib/meta-platform/queue/social-queue-adapter.ts';
import { createMetaSocialJobEnvelope } from '../../lib/meta-platform/queue/social-job-envelope.ts';

const standard = (overrides = {}) => createMetaInstagramOutboundJobEnvelope({
  attemptId: 'attempt-12345678',
  mode: 'MESSAGE',
  conversationId: 'conversation-12345678',
  accountId: 'account-12345678',
  messageId: 'message-12345678',
  correlationId: 'instagram-reply:12345678',
  environment: 'PRODUCTION',
  connectionKey: 'connection-12345678',
  ...overrides,
});

const privateReply = (overrides = {}) => createMetaInstagramOutboundJobEnvelope({
  attemptId: 'attempt-private-12345678',
  mode: 'PRIVATE_REPLY',
  conversationId: 'conversation-12345678',
  accountId: 'account-12345678',
  messageId: 'message-source-12345678',
  commentId: 'comment-12345678',
  correlationId: 'instagram-private:12345678',
  ...overrides,
});

test('standard reply envelope references durable attempt only', () => {
  const envelope = standard();
  assert.equal(envelope.jobType, 'SEND_INSTAGRAM_REPLY');
  assert.equal(envelope.payloadRef.kind, 'INSTAGRAM_REPLY_ATTEMPT');
  assert.equal(envelope.payloadRef.id, 'attempt-12345678');
  assert.equal(envelope.payloadRef.scope?.conversationId, 'conversation-12345678');
  assert.equal(envelope.receiptId, null);
  const serialized = JSON.stringify(envelope).toLowerCase();
  assert.doesNotMatch(serialized, /message text|access.?token|secret|recipient|body/);
});

test('private reply envelope requires comment scope and uses separate job type', () => {
  const envelope = privateReply();
  assert.equal(envelope.jobType, 'SEND_INSTAGRAM_PRIVATE_REPLY');
  assert.equal(envelope.payloadRef.scope?.commentId, 'comment-12345678');
  assert.throws(() => privateReply({ commentId: null }), /META_INSTAGRAM_PRIVATE_REPLY_COMMENT_ID_REQUIRED/);
});

test('outbound dedupe keys are deterministic and mode-separated', () => {
  const a = buildMetaInstagramOutboundDedupeKey({ attemptId: 'attempt-12345678', mode: 'MESSAGE' });
  const b = buildMetaInstagramOutboundDedupeKey({ attemptId: 'attempt-12345678', mode: 'MESSAGE' });
  const c = buildMetaInstagramOutboundDedupeKey({ attemptId: 'attempt-12345678', mode: 'PRIVATE_REPLY' });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^social:send-instagram-reply:[a-f0-9]{64}$/);
});

test('enqueue delegates canonical envelope to shared adapter', async () => {
  let captured;
  const result = await enqueueMetaInstagramOutboundJob({
    adapter: {
      async enqueue(envelope) {
        captured = envelope;
        return { outcome: 'ENQUEUED', accepted: true, deduplicated: false, auditId: 'audit-12345678', jobId: 'job-12345678', status: 'QUEUED', envelope };
      },
    },
    attemptId: 'attempt-12345678', mode: 'MESSAGE', conversationId: 'conversation-12345678',
    correlationId: 'instagram-reply:12345678',
  });
  assert.equal(result.result.accepted, true);
  assert.equal(captured.jobType, 'SEND_INSTAGRAM_REPLY');
});

test('executor ACKs a successful standard reply', async () => {
  const envelope = standard();
  const claim = createMetaSocialQueueClaim({
    queueName: 'meta-instagram', jobName: 'instagram-reply', jobId: 'job-12345678', deliveryAttempt: 1, envelope,
  });
  let input;
  const execution = await executeMetaInstagramOutboundJob({
    claim,
    processAttempt: async (value) => { input = value; return { providerMessageId: 'mid-12345678' }; },
    now: new Date('2026-07-25T18:30:00.000Z'),
  });
  assert.equal(execution.outcome, 'ACK');
  assert.equal(input.attemptId, 'attempt-12345678');
  assert.equal(input.mode, 'MESSAGE');
  assert.equal(execution.queueResult.resultRef?.id, 'attempt-12345678');
});

test('executor ACKs a successful private reply', async () => {
  const envelope = privateReply();
  const claim = createMetaSocialQueueClaim({
    queueName: 'meta-instagram', jobName: 'instagram-private-reply', jobId: 'job-private-12345678', deliveryAttempt: 1, envelope,
  });
  const execution = await executeMetaInstagramOutboundJob({ claim, processAttempt: async () => ({ ok: true }) });
  assert.equal(execution.outcome, 'ACK');
});

test('invalid outbound references are permanent NACKs', async () => {
  const unrelatedEnvelope = createMetaSocialJobEnvelope({
    jobType: 'REPLAY_SOCIAL_EVENT', receiptId: null, correlationId: 'replay-event:12345678',
    dedupeKey: 'social:replay-social-event:12345678',
    payloadRef: { kind: 'META_JOB_AUDIT', id: 'audit-12345678' },
    observability: { component: 'test-suite', operation: 'replay', platform: 'META' },
  });
  const claim = createMetaSocialQueueClaim({
    queueName: 'meta-social', jobName: 'social-event-replay', jobId: 'job-invalid-12345678', deliveryAttempt: 1,
    envelope: unrelatedEnvelope,
  });
  const execution = await executeMetaInstagramOutboundJob({ claim, processAttempt: async () => ({}) });
  assert.equal(execution.outcome, 'NACK');
  assert.equal(execution.queueResult.classification, 'PERMANENT');
});

test('unknown provider write requires reconciliation and is never retryable', () => {
  const decision = classifyMetaInstagramOutboundFailure(Object.assign(new Error('socket hang up'), { unknownOutcome: true }));
  assert.equal(decision.classification, 'UNKNOWN_WRITE');
});

test('provider message ID absence is unknown write', () => {
  assert.equal(classifyMetaInstagramOutboundFailure({ code: 'INSTAGRAM_PROVIDER_MESSAGE_ID_MISSING' }).classification, 'UNKNOWN_WRITE');
});

test('rate limits retain Retry-After', () => {
  const decision = classifyMetaInstagramOutboundFailure({ code: 'RATE_LIMIT', status: 429, retryAfterMs: 12_000 });
  assert.equal(decision.classification, 'RATE_LIMIT');
  assert.equal(decision.retryAfterMs, 12_000);
});

test('policy and kill-switch failures are non-retryable', () => {
  assert.equal(classifyMetaInstagramOutboundFailure({ code: 'WINDOW_EXPIRED' }).classification, 'POLICY_BLOCKED');
  assert.equal(classifyMetaInstagramOutboundFailure({ code: 'INSTAGRAM_OUTBOUND_KILL_SWITCH_ACTIVE' }).classification, 'POLICY_BLOCKED');
});

test('admin route queues durable request instead of direct provider write', () => {
  const route = fs.readFileSync('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts', 'utf8');
  const service = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  assert.match(route, /requestInstagramStandardReplyProduction/);
  assert.match(route, /requestInstagramPrivateReplyProduction/);
  assert.match(service, /stageInstagramReplyMessageStorage/);
  assert.match(service, /enqueueMetaInstagramOutboundJob/);
  assert.ok(service.indexOf('stageInstagramReplyMessageStorage') < service.indexOf('enqueueMetaInstagramOutboundJob'));
});

test('stale SENDING and post-provider persistence gaps require reconciliation', () => {
  const service = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  const policy = fs.readFileSync('lib/meta-platform/domains/instagram/send-reply.ts', 'utf8');
  const repository = fs.readFileSync('lib/meta-platform/repositories/prisma-instagram-persistence.ts', 'utf8');
  assert.match(policy, /input\.providerStatus === 'SENDING'/);
  assert.match(policy, /MARK_UNKNOWN_AND_RECONCILE/);
  assert.match(service, /INSTAGRAM_WORKER_CRASH_AFTER_WRITE_POSSIBLE/);
  assert.match(service, /INSTAGRAM_PROVIDER_WRITE_PERSISTENCE_UNKNOWN/);
  assert.match(repository, /"providerMessageId"=COALESCE\(\$5,"providerMessageId"\)/);
});

test('worker handles standard/private jobs and blocks blind unknown-write retries', () => {
  const worker = fs.readFileSync('workers/meta-instagram.worker.ts', 'utf8');
  assert.match(worker, /META_JOB_NAMES\.INSTAGRAM_REPLY/);
  assert.match(worker, /META_JOB_NAMES\.INSTAGRAM_PRIVATE_REPLY/);
  assert.match(worker, /reconciliationRequired/);
  assert.match(worker, /UNKNOWN_WRITE/);
  assert.match(worker, /UnrecoverableError/);
});

test('execution rechecks policy, permission, kill switch and one-shot reservation', () => {
  const source = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  assert.match(source, /assertInstagramOutboundWriteEnabled\(input\.mode\)/);
  assert.match(source, /getLatestMetaConnectionReadiness/);
  assert.match(source, /evaluateInstagramReplyPolicy/);
  assert.match(source, /privateReservationStatus/);
  assert.match(source, /INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED/);
});

test('repository stages text durably and converges sent, retry, block and unknown states', () => {
  const source = fs.readFileSync('lib/meta-platform/repositories/prisma-instagram-persistence.ts', 'utf8');
  for (const symbol of [
    'stageInstagramReplyMessageStorage', 'loadInstagramReplyExecutionStorage',
    'markInstagramReplyRetryableStorage', 'markInstagramReplyBlockedStorage',
    'markInstagramReplyUnknownOutcomeStorage', 'markInstagramReplySentStorage',
  ]) assert.match(source, new RegExp(symbol));
  assert.match(source, /"providerStatus"='UNKNOWN_OUTCOME'/);
  assert.match(source, /"reconciliationStatus"='REQUIRED'/);
  assert.match(source, /"outboundIdempotencyKey"/);
  assert.match(source, /"status"='BLOCKED',"providerStatus"='FAILED'/);
  assert.match(source, /"status"='FAILED',"providerStatus"='UNKNOWN_OUTCOME'/);
  assert.match(source, /"status"='FAILED',"providerStatus"='FAILED'/);
});

test('queue outage can be recovered by repeating the same idempotent request', () => {
  const service = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  const repository = fs.readFileSync('lib/meta-platform/repositories/prisma-instagram-persistence.ts', 'utf8');
  assert.doesNotMatch(service, /if \(!stored\.created\) return \{ deduplicated: true/);
  assert.match(service, /deduplicated: !stored\.created \|\| queued\.result\.deduplicated/);
  assert.match(repository, /existing\.replyAttemptId !== input\.attemptId/);
});

test('outbound realtime event is deterministic and contains no reply text', () => {
  const event = createMetaInstagramOutboundRealtimeEvent({
    attemptId: 'attempt-12345678',
    conversationId: 'conversation-12345678',
    messageId: 'message-12345678',
    correlationId: 'instagram-reply:12345678',
    mode: 'MESSAGE',
    state: 'SENT',
    providerMessageId: 'provider-message-12345678',
    occurredAt: '2026-07-25T18:30:00.000Z',
    emittedAt: '2026-07-25T18:30:01.000Z',
  });
  const again = createMetaInstagramOutboundRealtimeEvent({
    attemptId: 'attempt-12345678', conversationId: 'conversation-12345678', messageId: 'message-12345678',
    correlationId: 'instagram-reply:12345678', mode: 'MESSAGE', state: 'SENT',
    providerMessageId: 'provider-message-12345678', occurredAt: '2026-07-25T18:30:00.000Z',
  });
  assert.equal(event.type, 'INSTAGRAM_REPLY_STATE_CHANGED');
  assert.equal(event.eventId, again.eventId);
  assert.doesNotMatch(JSON.stringify(event).toLowerCase(), /text|body|token|secret/);
});

test('outbound state changes publish safe realtime events', () => {
  const service = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  const realtime = fs.readFileSync('lib/meta/instagram/realtime.ts', 'utf8');
  assert.match(service, /publishInstagramOutboundState/);
  assert.match(service, /state: 'QUEUED'/);
  assert.match(service, /state: 'SENT'/);
  assert.match(service, /'UNKNOWN_OUTCOME'/);
  assert.match(realtime, /publishMetaInstagramOutboundRealtimeEvent/);
});
