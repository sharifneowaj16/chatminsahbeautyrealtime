import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  buildMetaInstagramInboundDedupeKey,
  classifyMetaInstagramInboundFailure,
  createMetaInstagramInboundJobEnvelope,
  enqueueMetaInstagramInboundJob,
  executeMetaInstagramInboundJob,
} from '../../lib/meta-platform/queue/instagram-inbound-job.ts';
import {
  buildMetaSocialAttachmentValidationDedupeKey,
  createMetaSocialAttachmentValidationJobEnvelope,
} from '../../lib/meta-platform/queue/social-attachment-validation-job.ts';
import { createMetaInstagramInboundRealtimeEvent } from '../../lib/meta-platform/queue/instagram-inbound-event.ts';
import { createMetaSocialJobEnvelope } from '../../lib/meta-platform/queue/social-job-envelope.ts';
import { createMetaSocialQueueClaim } from '../../lib/meta-platform/queue/social-queue-adapter.ts';

const NOW = new Date('2026-07-25T18:20:00.000Z');

function instagramEnvelope(overrides = {}) {
  return createMetaInstagramInboundJobEnvelope({
    receiptId: 'ig-receipt-1',
    providerMessageId: 'ig-message-1',
    accountId: 'ig-account-1',
    correlationId: 'instagram-webhook:1234567890',
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    scheduledAt: NOW,
    ...overrides,
  });
}

function claim(envelope = instagramEnvelope(), overrides = {}) {
  return createMetaSocialQueueClaim({
    queueName: 'meta-instagram',
    jobName: 'instagram-message',
    jobId: 'ig-job-1',
    auditId: 'ig-audit-1',
    deliveryAttempt: 1,
    claimedAt: NOW,
    envelope,
    ...overrides,
  });
}

test('Instagram inbound dedupe key is deterministic and scoped by receipt/provider message', () => {
  const first = buildMetaInstagramInboundDedupeKey({ receiptId: 'ig-receipt-1', providerMessageId: 'ig-message-1' });
  const second = buildMetaInstagramInboundDedupeKey({ receiptId: 'ig-receipt-1', providerMessageId: 'ig-message-1' });
  const other = buildMetaInstagramInboundDedupeKey({ receiptId: 'ig-receipt-2', providerMessageId: 'ig-message-1' });
  assert.equal(first, second);
  assert.match(first, /^social:process-instagram-inbound:[a-f0-9]{64}$/);
  assert.notEqual(first, other);
});

test('Instagram inbound envelope contains only durable receipt/account/message references', () => {
  const envelope = instagramEnvelope();
  assert.equal(envelope.jobType, 'PROCESS_INSTAGRAM_INBOUND');
  assert.deepEqual(envelope.payloadRef, {
    kind: 'WEBHOOK_RECEIPT',
    id: 'ig-receipt-1',
    providerObjectId: 'ig-message-1',
    scope: { accountId: 'ig-account-1' },
  });
  const serialized = JSON.stringify(envelope).toLowerCase();
  assert.doesNotMatch(serialized, /access.?token|message.?text|source.?url|participant.?name|rawpayload/);
});

test('Instagram handoff enqueues the canonical envelope through shared adapter', async () => {
  const seen = [];
  const queued = await enqueueMetaInstagramInboundJob({
    adapter: {
      async enqueue(envelope) {
        seen.push(envelope);
        return {
          outcome: 'ENQUEUED', accepted: true, deduplicated: false,
          auditId: 'ig-audit-1', jobId: 'ig-job-1', status: 'QUEUED', envelope,
        };
      },
    },
    receiptId: 'ig-receipt-1',
    providerMessageId: 'ig-message-1',
    accountId: 'ig-account-1',
    correlationId: 'instagram-webhook:1234567890',
    scheduledAt: NOW,
  });
  assert.equal(seen.length, 1);
  assert.equal(queued.result.outcome, 'ENQUEUED');
  assert.equal(queued.envelope, seen[0]);
});

test('Instagram worker execution passes canonical identifiers to receipt processor and ACKs', async () => {
  const calls = [];
  const execution = await executeMetaInstagramInboundJob({
    claim: claim(),
    now: NOW,
    processReceipt: async (input) => {
      calls.push(input);
      return { conversationId: 'conversation-1', messageId: 'message-1', outOfOrder: false };
    },
  });
  assert.equal(execution.outcome, 'ACK');
  assert.deepEqual(calls, [{
    receiptId: 'ig-receipt-1',
    providerMessageId: 'ig-message-1',
    accountId: 'ig-account-1',
    now: NOW,
  }]);
  assert.equal(execution.queueResult.resultRef?.id, 'ig-receipt-1');
});

test('duplicate and out-of-order persistence result is still an ACK', async () => {
  const execution = await executeMetaInstagramInboundJob({
    claim: claim(),
    processReceipt: async () => ({ deduplicated: true, outOfOrder: true, messageId: 'message-1' }),
  });
  assert.equal(execution.outcome, 'ACK');
  assert.equal(execution.value.deduplicated, true);
  assert.equal(execution.value.outOfOrder, true);
});

test('wrong job type is permanently rejected before processing', async () => {
  let called = false;
  const wrong = createMetaSocialJobEnvelope({
    jobType: 'PROCESS_META_LEAD',
    receiptId: 'ig-receipt-1',
    correlationId: 'instagram-webhook:1234567890',
    scheduledAt: NOW,
    dedupeKey: 'social:process-meta-lead:instagram-case',
    payloadRef: { kind: 'WEBHOOK_RECEIPT', id: 'ig-receipt-1', providerObjectId: 'lead-1' },
    observability: { component: 'test-worker', operation: 'process-lead', platform: 'LEAD_ADS' },
  });
  const execution = await executeMetaInstagramInboundJob({
    claim: claim(wrong),
    processReceipt: async () => { called = true; },
  });
  assert.equal(called, false);
  assert.equal(execution.outcome, 'NACK');
  assert.equal(execution.queueResult.classification, 'PERMANENT');
});

test('rate limit is retryable and preserves Retry-After', async () => {
  const execution = await executeMetaInstagramInboundJob({
    claim: claim(),
    processReceipt: async () => {
      throw Object.assign(new Error('provider throttled'), { code: '613', status: 429, retryAfterMs: 90_000 });
    },
  });
  assert.equal(execution.outcome, 'NACK');
  assert.equal(execution.queueResult.classification, 'RATE_LIMIT');
  assert.equal(execution.queueResult.retryable, true);
  assert.equal(execution.queueResult.retryAfterMs, 90_000);
});

test('authentication and permission errors are not blindly retried', () => {
  assert.equal(classifyMetaInstagramInboundFailure(Object.assign(new Error('token expired'), { code: '190' })).classification, 'AUTH');
  assert.equal(classifyMetaInstagramInboundFailure(Object.assign(new Error('permission denied'), { status: 403 })).classification, 'AUTH');
});

test('account and participant scope mismatches are policy-blocked', () => {
  const account = classifyMetaInstagramInboundFailure(Object.assign(new Error('wrong account'), {
    code: 'INSTAGRAM_INBOUND_ACCOUNT_SCOPE_MISMATCH', permanent: true,
  }));
  const participant = classifyMetaInstagramInboundFailure(Object.assign(new Error('participant mismatch'), {
    code: 'INSTAGRAM_CONVERSATION_PARTICIPANT_MISMATCH', permanent: true,
  }));
  assert.equal(account.classification, 'POLICY_BLOCKED');
  assert.equal(participant.classification, 'POLICY_BLOCKED');
});

test('malformed normalized event is permanent while queue/media outage is transient', () => {
  const malformed = classifyMetaInstagramInboundFailure(Object.assign(new Error('bad event'), {
    code: 'INSTAGRAM_EVENT_TIMESTAMP_INVALID', permanent: true,
  }));
  const queue = classifyMetaInstagramInboundFailure(Object.assign(new Error('redis down'), {
    code: 'SOCIAL_QUEUE_UNAVAILABLE', retryable: true,
  }));
  assert.equal(malformed.classification, 'PERMANENT');
  assert.equal(queue.classification, 'TRANSIENT');
});

test('attachment validation job references durable attachment/message/conversation IDs only', () => {
  const sourceDigest = 'a'.repeat(64);
  const envelope = createMetaSocialAttachmentValidationJobEnvelope({
    attachmentId: 'attachment-1',
    messageId: 'message-1',
    conversationId: 'conversation-1',
    accountId: 'ig-account-1',
    correlationId: 'instagram-webhook:1234567890',
    sourceDigest,
    scheduledAt: NOW,
  });
  assert.equal(envelope.jobType, 'VALIDATE_SOCIAL_ATTACHMENT');
  assert.deepEqual(envelope.payloadRef, {
    kind: 'SOCIAL_ATTACHMENT',
    id: 'attachment-1',
    digest: sourceDigest,
    scope: { messageId: 'message-1', conversationId: 'conversation-1', accountId: 'ig-account-1' },
  });
  assert.match(buildMetaSocialAttachmentValidationDedupeKey({ attachmentId: 'attachment-1', sourceDigest }), /^social:validate-social-attachment:[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(envelope), /https?:\/\//);
});

test('normalized realtime event is deterministic, ordered and contains no message content or PII', () => {
  const first = createMetaInstagramInboundRealtimeEvent({
    receiptId: 'canonical-receipt-1',
    conversationId: 'conversation-1',
    messageId: 'message-1',
    correlationId: 'instagram-webhook:1234567890',
    providerMessageId: 'ig-message-1',
    direction: 'INBOUND',
    messageType: 'TEXT',
    occurredAt: '2026-07-25T18:19:00.000Z',
    emittedAt: NOW,
    deduplicated: false,
    outOfOrder: true,
  });
  const second = createMetaInstagramInboundRealtimeEvent({
    ...first,
    occurredAt: first.occurredAt,
    emittedAt: '2026-07-25T18:21:00.000Z',
  });
  assert.equal(first.eventId, second.eventId);
  assert.equal(first.outOfOrder, true);
  const serialized = JSON.stringify(first).toLowerCase();
  assert.doesNotMatch(serialized, /messagetext|rawmessage|email|phone|username|avatarurl|sourceurl/);
});

test('Instagram processing source schedules media asynchronously and emits before terminal receipt completion', () => {
  const source = fs.readFileSync('lib/meta/instagram/messages.ts', 'utf8');
  assert.match(source, /scheduleAttachmentValidation/);
  assert.match(source, /createMetaInstagramInboundRealtimeEvent/);
  assert.match(source, /persisted\.created && !persisted\.orderingAdvanced/);
  assert.doesNotMatch(source, /downloadInstagramAttachment/);
  assert.ok(source.indexOf('emitRealtimeEvent') < source.indexOf("status: 'PROCESSED'"));
});

test('invalid identifiers fail before queueing', () => {
  assert.throws(() => instagramEnvelope({ providerMessageId: 'message with spaces' }), /META_INSTAGRAM_INBOUND_PROVIDER_MESSAGE_ID_INVALID/);
  assert.throws(() => createMetaSocialAttachmentValidationJobEnvelope({
    attachmentId: 'bad attachment',
    messageId: 'message-1',
    conversationId: 'conversation-1',
    accountId: 'ig-account-1',
    correlationId: 'instagram-webhook:1234567890',
  }), /META_SOCIAL_ATTACHMENT_ID_INVALID/);
});
