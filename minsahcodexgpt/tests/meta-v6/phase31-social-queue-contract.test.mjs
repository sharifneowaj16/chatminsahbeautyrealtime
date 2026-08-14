import assert from 'node:assert/strict';
import test from 'node:test';
import {
  META_SOCIAL_JOB_REFERENCE_CONTRACT,
  META_SOCIAL_JOB_TYPES,
  metaSocialJobDedupePrefix,
} from '../../lib/meta-platform/queue/social-job-types.ts';
import {
  createMetaSocialJobEnvelope,
  MetaSocialJobEnvelopeError,
  validateMetaSocialJobEnvelope,
} from '../../lib/meta-platform/queue/social-job-envelope.ts';
import {
  ackMetaSocialQueueJob,
  createMetaSocialQueueClaim,
  nackMetaSocialQueueJob,
} from '../../lib/meta-platform/queue/social-queue-adapter.ts';
import {
  claimBullMqSocialJob,
  createBullMqSocialQueueAdapter,
  mapMetaSocialEnvelopeToBullMq,
  META_SOCIAL_BULLMQ_ROUTES,
} from '../../lib/meta-platform/queue/bullmq-social-adapter.ts';
import {
  META_JOB_NAMES,
  META_QUEUE_NAMES,
  validateMetaJobPayload,
} from '../../lib/jobs/job-types.ts';

const NOW = '2026-07-25T17:30:00.000Z';
const CORRELATION_ID = 'social-job:corr-00000001';

const CASES = Object.freeze({
  PROCESS_META_LEAD: {
    receiptId: 'receipt-lead-1',
    payloadRef: { kind: 'WEBHOOK_RECEIPT', id: 'receipt-lead-1', providerObjectId: 'leadgen-1', scope: { pageId: 'page-1', formId: 'form-1' } },
    platform: 'LEAD_ADS',
  },
  PROCESS_INSTAGRAM_INBOUND: {
    receiptId: 'receipt-ig-1',
    payloadRef: { kind: 'WEBHOOK_RECEIPT', id: 'receipt-ig-1', providerObjectId: 'ig-event-1', scope: { accountId: 'ig-account-1' } },
    platform: 'INSTAGRAM',
  },
  SEND_INSTAGRAM_REPLY: {
    receiptId: null,
    payloadRef: { kind: 'INSTAGRAM_REPLY_ATTEMPT', id: 'reply-attempt-1', scope: { conversationId: 'conversation-1' } },
    platform: 'INSTAGRAM',
  },
  SEND_INSTAGRAM_PRIVATE_REPLY: {
    receiptId: null,
    payloadRef: { kind: 'INSTAGRAM_PRIVATE_REPLY_RESERVATION', id: 'private-reservation-1', scope: { commentId: 'comment-1' } },
    platform: 'INSTAGRAM',
  },
  VALIDATE_SOCIAL_ATTACHMENT: {
    receiptId: null,
    payloadRef: { kind: 'SOCIAL_ATTACHMENT', id: 'attachment-1', digest: 'a'.repeat(64), scope: { messageId: 'message-1' } },
    platform: 'INSTAGRAM',
  },
  REPLAY_SOCIAL_EVENT: {
    receiptId: null,
    payloadRef: { kind: 'META_JOB_AUDIT', id: 'audit-1' },
    platform: 'META',
  },
  SYNC_FACEBOOK_PAGE_INBOX: {
    receiptId: null,
    payloadRef: { kind: 'FACEBOOK_PAGE_SYNC_REQUEST', id: 'fb-sync-request-1', scope: { pageId: 'page-1' } },
    platform: 'FACEBOOK_PAGE',
  },
  REFRESH_META_PERMISSION_HEALTH: {
    receiptId: null,
    payloadRef: { kind: 'META_CONNECTION', id: 'connection-1', scope: { connectionId: 'connection-1' } },
    platform: 'META',
  },
});

function envelope(jobType, overrides = {}) {
  const definition = CASES[jobType];
  return createMetaSocialJobEnvelope({
    jobType,
    receiptId: definition.receiptId,
    correlationId: CORRELATION_ID,
    scheduledAt: NOW,
    dedupeKey: `${metaSocialJobDedupePrefix(jobType)}case-1`,
    payloadRef: definition.payloadRef,
    observability: {
      component: 'meta-platform',
      operation: jobType.toLowerCase(),
      platform: definition.platform,
      environment: 'PRODUCTION',
      connectionKey: 'primary',
      traceId: 'trace-00000001',
    },
    ...overrides,
  });
}

test('canonical contract publishes exactly the eight required social job types', () => {
  assert.deepEqual(META_SOCIAL_JOB_TYPES, [
    'PROCESS_META_LEAD',
    'PROCESS_INSTAGRAM_INBOUND',
    'SEND_INSTAGRAM_REPLY',
    'SEND_INSTAGRAM_PRIVATE_REPLY',
    'VALIDATE_SOCIAL_ATTACHMENT',
    'REPLAY_SOCIAL_EVENT',
    'SYNC_FACEBOOK_PAGE_INBOX',
    'REFRESH_META_PERMISSION_HEALTH',
  ]);
  assert.deepEqual(META_SOCIAL_JOB_REFERENCE_CONTRACT.PROCESS_META_LEAD, ['WEBHOOK_RECEIPT']);
  assert.deepEqual(META_SOCIAL_JOB_REFERENCE_CONTRACT.SEND_INSTAGRAM_REPLY, ['INSTAGRAM_REPLY_ATTEMPT']);
});

test('all canonical jobs create versioned bounded durable-reference envelopes', () => {
  for (const jobType of META_SOCIAL_JOB_TYPES) {
    const created = envelope(jobType);
    assert.equal(created.schemaVersion, 1);
    assert.equal(created.attemptNumber, 1);
    assert.equal(created.jobType, jobType);
    assert.equal(created.scheduledAt, NOW);
    assert.ok(created.dedupeKey.startsWith(metaSocialJobDedupePrefix(jobType)));
    assert.ok(Object.isFrozen(created));
    assert.ok(Object.isFrozen(created.payloadRef));
    assert.ok(Object.isFrozen(created.observability));
  }
});

test('receipt-first jobs require a matching durable receipt reference', () => {
  assert.throws(() => envelope('PROCESS_META_LEAD', { receiptId: null }), MetaSocialJobEnvelopeError);
  assert.throws(() => envelope('PROCESS_INSTAGRAM_INBOUND', {
    receiptId: 'receipt-other',
  }), MetaSocialJobEnvelopeError);
});

test('dedupe keys must be namespaced by canonical job type', () => {
  assert.throws(() => envelope('SEND_INSTAGRAM_REPLY', { dedupeKey: 'instagram-reply:case-1' }), (error) => {
    assert.ok(error instanceof MetaSocialJobEnvelopeError);
    assert.ok(error.issues.some((issue) => issue.code === 'SOCIAL_JOB_DEDUPE_NAMESPACE_INVALID'));
    return true;
  });
});

test('raw payloads, message text, URLs and unknown fields are rejected', () => {
  const valid = envelope('SEND_INSTAGRAM_REPLY');
  const unsafe = structuredClone(valid);
  unsafe.payloadRef.messageText = 'customer message';
  unsafe.payloadRef.sourceUrl = 'https://example.com/private-media';
  const result = validateMetaSocialJobEnvelope(unsafe);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'SOCIAL_JOB_SECRET_OR_PII_FIELD_FORBIDDEN'));
  assert.ok(result.issues.some((issue) => issue.code === 'SOCIAL_JOB_URL_VALUE_FORBIDDEN'));
});

test('canonical jobs map to compatible existing queues and additive missing jobs', () => {
  assert.deepEqual(META_SOCIAL_BULLMQ_ROUTES.PROCESS_META_LEAD, {
    queueName: META_QUEUE_NAMES.LEADS,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payloadType: 'lead_fetch',
    compatibility: 'EXISTING',
  });
  assert.deepEqual(META_SOCIAL_BULLMQ_ROUTES.PROCESS_INSTAGRAM_INBOUND, {
    queueName: META_QUEUE_NAMES.INSTAGRAM,
    jobName: META_JOB_NAMES.INSTAGRAM_MESSAGE,
    payloadType: 'instagram_message',
    compatibility: 'EXISTING',
  });
  assert.equal(META_SOCIAL_BULLMQ_ROUTES.REFRESH_META_PERMISSION_HEALTH.jobName, META_JOB_NAMES.CONNECTION_HEALTH);
  assert.equal(META_SOCIAL_BULLMQ_ROUTES.VALIDATE_SOCIAL_ATTACHMENT.queueName, META_QUEUE_NAMES.SOCIAL);
});

test('BullMQ mappings preserve the canonical envelope and pass shared payload validation', () => {
  for (const jobType of META_SOCIAL_JOB_TYPES) {
    const created = envelope(jobType);
    const mapped = mapMetaSocialEnvelopeToBullMq(created);
    const validation = validateMetaJobPayload({
      queueName: mapped.queueName,
      jobName: mapped.jobName,
      payload: mapped.payload,
    });
    assert.equal(validation.valid, true, `${jobType}: ${JSON.stringify(validation.issues)}`);
    assert.deepEqual(mapped.payload.socialEnvelope, created);
    assert.equal(mapped.payload.idempotencyKey, created.dedupeKey);
    assert.equal(mapped.sourceId, created.payloadRef.id);
  }
});

test('Lead compatibility mapping carries only safe identifiers required by the existing worker', () => {
  const mapped = mapMetaSocialEnvelopeToBullMq(envelope('PROCESS_META_LEAD'));
  assert.equal(mapped.queueName, 'meta-leads');
  assert.equal(mapped.jobName, 'lead-fetch');
  assert.equal(mapped.payload.receiptId, 'receipt-lead-1');
  assert.equal(mapped.payload.leadgenId, 'leadgen-1');
  assert.equal(mapped.payload.pageId, 'page-1');
  assert.equal(mapped.payload.formId, 'form-1');
  const serialized = JSON.stringify(mapped.payload).toLowerCase();
  for (const forbidden of ['access_token', 'authorization', 'email', 'phone', 'message_text', 'https://']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('adapter reports enqueue and dedupe without exposing BullMQ to domain code', async () => {
  const calls = [];
  const adapter = createBullMqSocialQueueAdapter({
    enqueueMetaJob: async (input) => {
      calls.push(input);
      return {
        accepted: true,
        deduplicated: calls.length > 1,
        auditId: 'audit-1',
        jobId: 'meta-social-job-1',
        idempotencyKey: input.payload.idempotencyKey,
        status: 'QUEUED',
      };
    },
  });
  const created = envelope('VALIDATE_SOCIAL_ATTACHMENT');
  const first = await adapter.enqueue(created);
  const duplicate = await adapter.enqueue(created);
  assert.equal(first.outcome, 'ENQUEUED');
  assert.equal(first.accepted, true);
  assert.equal(duplicate.outcome, 'DEDUPLICATED');
  assert.equal(duplicate.deduplicated, true);
  assert.equal(calls[0].queueName, 'meta-social');
  assert.equal(calls[0].jobName, 'social-attachment-validation');
});

test('scheduledAt maps to a BullMQ delay without embedding mutable payload data', async () => {
  const calls = [];
  const adapter = createBullMqSocialQueueAdapter({
    now: () => new Date('2026-07-25T17:29:00.000Z'),
    enqueueMetaJob: async (input) => {
      calls.push(input);
      return {
        accepted: true,
        deduplicated: false,
        auditId: 'audit-scheduled-1',
        jobId: 'job-scheduled-1',
        idempotencyKey: input.payload.idempotencyKey,
        status: 'QUEUED',
      };
    },
  });
  const result = await adapter.enqueue(envelope('SYNC_FACEBOOK_PAGE_INBOX'));
  assert.equal(result.outcome, 'ENQUEUED');
  assert.deepEqual(calls[0].options, { delay: 60_000 });
});

test('queue connectivity failures become recoverable deferred outcomes', async () => {
  const adapter = createBullMqSocialQueueAdapter({
    now: () => new Date(NOW),
    unavailableRetryMs: 30_000,
    enqueueMetaJob: async () => {
      const error = new Error('Redis connection ECONNREFUSED');
      Object.assign(error, { code: 'ECONNREFUSED' });
      throw error;
    },
  });
  const result = await adapter.enqueue(envelope('PROCESS_INSTAGRAM_INBOUND'));
  assert.deepEqual({
    outcome: result.outcome,
    accepted: result.accepted,
    recoverable: result.recoverable,
    code: result.code,
    retryAt: result.retryAt,
  }, {
    outcome: 'DEFERRED',
    accepted: false,
    recoverable: true,
    code: 'SOCIAL_QUEUE_UNAVAILABLE',
    retryAt: '2026-07-25T17:30:30.000Z',
  });
});

test('programming and contract failures are not mislabeled as queue outages', async () => {
  const adapter = createBullMqSocialQueueAdapter({
    enqueueMetaJob: async () => {
      throw new Error('Unexpected mapping invariant');
    },
  });
  await assert.rejects(() => adapter.enqueue(envelope('REPLAY_SOCIAL_EVENT')), /Unexpected mapping invariant/);
});

test('claim, ack and nack contracts remain provider agnostic and safe', () => {
  const created = envelope('SEND_INSTAGRAM_REPLY');
  const mapped = mapMetaSocialEnvelopeToBullMq(created);
  const claim = claimBullMqSocialJob({
    queueName: mapped.queueName,
    jobName: mapped.jobName,
    jobId: 'meta-instagram-job-1',
    attemptsMade: 1,
    claimedAt: NOW,
    data: { ...mapped.payload, auditId: 'audit-1' },
  });
  assert.equal(claim.transport, 'BULLMQ');
  assert.equal(claim.deliveryAttempt, 2);
  assert.equal(claim.envelope.jobType, 'SEND_INSTAGRAM_REPLY');

  const genericClaim = createMetaSocialQueueClaim({
    queueName: 'meta-instagram',
    jobName: 'instagram-reply',
    jobId: 'job-2',
    auditId: null,
    deliveryAttempt: 1,
    claimedAt: NOW,
    envelope: created,
  });
  assert.equal(genericClaim.auditId, null);

  const ack = ackMetaSocialQueueJob({
    completedAt: NOW,
    resultRef: { kind: 'INSTAGRAM_REPLY_ATTEMPT', id: 'reply-attempt-1' },
  });
  assert.equal(ack.action, 'ACK');

  const transient = nackMetaSocialQueueJob({
    classification: 'TRANSIENT',
    safeReasonCode: 'META_PROVIDER_TIMEOUT',
    retryAfterMs: 60_000,
  });
  assert.equal(transient.retryable, true);
  assert.equal(transient.reconciliationRequired, false);

  const unknownWrite = nackMetaSocialQueueJob({
    classification: 'UNKNOWN_WRITE',
    safeReasonCode: 'META_WRITE_OUTCOME_UNKNOWN',
  });
  assert.equal(unknownWrite.retryable, false);
  assert.equal(unknownWrite.reconciliationRequired, true);
});
