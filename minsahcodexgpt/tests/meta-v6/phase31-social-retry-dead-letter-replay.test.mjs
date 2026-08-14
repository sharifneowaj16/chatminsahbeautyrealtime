import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMetaSocialRetryError,
  decideMetaSocialJobFailure,
  getMetaSocialRetryDelayMs,
  projectMetaJobFailureForAdmin,
} from '../../lib/meta-platform/queue/social-job-reliability.ts';
import { nackMetaSocialQueueJob, createMetaSocialQueueClaim } from '../../lib/meta-platform/queue/social-queue-adapter.ts';
import {
  buildMetaSocialReplayRequestDedupeKey,
  createMetaSocialReplayJobEnvelope,
  executeMetaSocialReplayJob,
} from '../../lib/meta-platform/queue/social-replay-job.ts';
import { createMetaSocialAttachmentValidationJobEnvelope } from '../../lib/meta-platform/queue/social-attachment-validation-job.ts';

const NOW = new Date('2026-07-25T19:30:00.000Z');

function transientNack(retryAfterMs) {
  return nackMetaSocialQueueJob({
    classification: 'TRANSIENT',
    safeReasonCode: 'META_PROVIDER_TEMPORARY',
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  });
}

function originalAudit(overrides = {}) {
  const socialEnvelope = createMetaSocialAttachmentValidationJobEnvelope({
    attachmentId: 'attachment-1',
    messageId: 'message-1',
    conversationId: 'conversation-1',
    accountId: 'account-1',
    correlationId: 'correlation-original-1',
    sourceDigest: 'a'.repeat(64),
    scheduledAt: NOW,
  });
  return {
    id: 'audit-original-1',
    queueName: 'meta-social',
    jobName: 'social-attachment-validation',
    externalJobId: 'job-original-1',
    idempotencyKey: socialEnvelope.dedupeKey,
    correlationId: socialEnvelope.correlationId,
    status: 'DEAD_LETTER',
    attempts: 5,
    maxAttempts: 5,
    progress: 0,
    sourceId: 'attachment-1',
    payload: {
      schemaVersion: 1,
      idempotencyKey: socialEnvelope.dedupeKey,
      requestedAt: NOW.toISOString(),
      correlationId: socialEnvelope.correlationId,
      sourceId: 'attachment-1',
      auditId: 'audit-original-1',
      type: 'social_attachment_validation',
      socialEnvelope,
    },
    lastError: { code: 'META_MEDIA_SCANNER_UNAVAILABLE', classification: 'TRANSIENT' },
    rateLimitState: null,
    replayOfId: null,
    replayCount: 0,
    requestedBy: null,
    nextRunAt: null,
    startedAt: NOW,
    completedAt: NOW,
    lastHeartbeatAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function replayClaim(originalId = 'audit-original-1') {
  const envelope = createMetaSocialReplayJobEnvelope({
    originalAuditId: originalId,
    approvalId: 'approval-1',
    correlationId: 'correlation-replay-1',
    scheduledAt: NOW,
  });
  return createMetaSocialQueueClaim({
    queueName: 'meta-social',
    jobName: 'social-event-replay',
    jobId: 'job-replay-request-1',
    auditId: 'audit-replay-request-1',
    deliveryAttempt: 1,
    claimedAt: NOW,
    envelope,
  });
}

test('retry delay is deterministic exponential backoff with bounded jitter', () => {
  const first = getMetaSocialRetryDelayMs({ attempt: 1, dedupeKey: 'social:test:alpha' });
  const same = getMetaSocialRetryDelayMs({ attempt: 1, dedupeKey: 'social:test:alpha' });
  const second = getMetaSocialRetryDelayMs({ attempt: 2, dedupeKey: 'social:test:alpha' });
  assert.equal(first, same);
  assert.ok(first >= 48_000 && first <= 72_000);
  assert.ok(second >= 96_000 && second <= 144_000);
  assert.ok(second > first);
});

test('provider Retry-After is a lower bound over local jitter', () => {
  assert.equal(getMetaSocialRetryDelayMs({ attempt: 1, dedupeKey: 'social:test:retry-after', retryAfterMs: 180_000 }), 180_000);
});

test('transient failures retry before max attempts and dead-letter when exhausted', () => {
  const retry = decideMetaSocialJobFailure({ nack: transientNack(), dedupeKey: 'social:test:retry', attempt: 2, maxAttempts: 5, now: NOW });
  assert.equal(retry.action, 'RETRY');
  assert.ok(retry.retryDelayMs > 0);
  assert.equal(retry.retryAt, new Date(NOW.getTime() + retry.retryDelayMs).toISOString());
  const exhausted = decideMetaSocialJobFailure({ nack: transientNack(), dedupeKey: 'social:test:retry', attempt: 5, maxAttempts: 5, now: NOW });
  assert.equal(exhausted.action, 'DEAD_LETTER');
  assert.equal(exhausted.safeReasonCode, 'META_SOCIAL_RETRY_EXHAUSTED');
});

test('auth, permanent and policy failures are terminal', () => {
  for (const classification of ['AUTH', 'PERMANENT', 'POLICY_BLOCKED']) {
    const decision = decideMetaSocialJobFailure({
      nack: nackMetaSocialQueueJob({ classification, safeReasonCode: `META_${classification}_FAILURE` }),
      dedupeKey: `social:test:${classification}`,
      attempt: 1,
      maxAttempts: 5,
    });
    assert.equal(decision.action, 'DEAD_LETTER');
    assert.equal(decision.retryDelayMs, null);
  }
});

test('unknown writes require reconciliation and never retry', () => {
  const decision = decideMetaSocialJobFailure({
    nack: nackMetaSocialQueueJob({ classification: 'UNKNOWN_WRITE', safeReasonCode: 'META_WRITE_OUTCOME_UNKNOWN' }),
    dedupeKey: 'social:test:unknown-write',
    attempt: 1,
    maxAttempts: 5,
  });
  assert.equal(decision.action, 'RECONCILE');
  assert.equal(decision.reconciliationRequired, true);
  assert.equal(decision.retryDelayMs, null);
});

test('retry error carries the exact auditable delay and safe classification', () => {
  const decision = decideMetaSocialJobFailure({ nack: transientNack(90_000), dedupeKey: 'social:test:error', attempt: 1, maxAttempts: 5, now: NOW });
  const error = createMetaSocialRetryError({ decision, dedupeKey: 'social:test:error' });
  assert.equal(error.code, 'META_PROVIDER_TEMPORARY');
  assert.equal(error.classification, 'TRANSIENT');
  assert.equal(error.retryDelayMs, decision.retryDelayMs);
  assert.equal(error.retryAfterMs, 90_000);
});

test('admin failure projection omits raw messages and provider payloads', () => {
  const projection = projectMetaJobFailureForAdmin({
    code: 'META_PROVIDER_TEMPORARY',
    classification: 'TRANSIENT',
    message: 'token secret and customer text',
    providerPayload: { access_token: 'secret' },
    retryAfterMs: 12_000,
  });
  assert.deepEqual(projection, {
    code: 'META_PROVIDER_TEMPORARY',
    classification: 'TRANSIENT',
    retryAfterMs: 12_000,
  });
});

test('replay request dedupe is deterministic and approval-scoped', () => {
  const left = buildMetaSocialReplayRequestDedupeKey({ originalAuditId: 'audit-original-1', approvalId: 'approval-1' });
  const right = buildMetaSocialReplayRequestDedupeKey({ originalAuditId: 'audit-original-1', approvalId: 'approval-1' });
  const other = buildMetaSocialReplayRequestDedupeKey({ originalAuditId: 'audit-original-1', approvalId: 'approval-2' });
  assert.equal(left, right);
  assert.notEqual(left, other);
  const envelope = createMetaSocialReplayJobEnvelope({ originalAuditId: 'audit-original-1', approvalId: 'approval-1', correlationId: 'correlation-replay-1', scheduledAt: NOW });
  assert.equal(envelope.payloadRef.kind, 'META_JOB_AUDIT');
  assert.equal(envelope.payloadRef.id, 'audit-original-1');
  assert.equal(envelope.payloadRef.digest.length, 64);
  assert.doesNotMatch(JSON.stringify(envelope), /approval-1|reason|message|token/i);
});

test('controlled replay creates a new audited job with dedupe protection', async () => {
  const source = originalAudit();
  const captured = [];
  let replayCount = 0;
  const result = await executeMetaSocialReplayJob({
    claim: replayClaim(),
    requestedBy: 'admin-2',
    now: NOW,
    dependencies: {
      getAudit: async () => source,
      enqueue: async (input) => {
        captured.push(input);
        return { auditId: 'audit-replayed-1', jobId: 'job-replayed-1' };
      },
      incrementReplayCount: async () => { replayCount += 1; },
    },
  });
  assert.equal(result.outcome, 'ACK');
  assert.equal(replayCount, 1);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].replayOfId, source.id);
  assert.equal(captured[0].requestedBy, 'admin-2');
  assert.notEqual(captured[0].payload.idempotencyKey, source.idempotencyKey);
  assert.equal(captured[0].payload.socialEnvelope.dedupeKey, captured[0].payload.idempotencyKey);
  assert.equal(captured[0].payload.socialEnvelope.observability.parentAuditId, source.id);
  assert.equal(captured[0].payload.socialEnvelope.attemptNumber, 2);
});

test('unknown provider outcomes cannot be replayed before reconciliation', async () => {
  let enqueued = false;
  const result = await executeMetaSocialReplayJob({
    claim: replayClaim(),
    dependencies: {
      getAudit: async () => originalAudit({ lastError: { code: 'META_UNKNOWN_OUTCOME', reconciliationRequired: true } }),
      enqueue: async () => { enqueued = true; return { auditId: 'unexpected' }; },
      incrementReplayCount: async () => undefined,
    },
  });
  assert.equal(result.outcome, 'NACK');
  assert.equal(result.queueResult.classification, 'UNKNOWN_WRITE');
  assert.equal(result.queueResult.reconciliationRequired, true);
  assert.equal(enqueued, false);
});

test('non-terminal source and replay recursion are blocked', async () => {
  for (const source of [
    originalAudit({ status: 'RUNNING' }),
    originalAudit({ jobName: 'social-event-replay', payload: { ...originalAudit().payload, type: 'social_event_replay' } }),
  ]) {
    const result = await executeMetaSocialReplayJob({
      claim: replayClaim(),
      dependencies: {
        getAudit: async () => source,
        enqueue: async () => ({ auditId: 'unexpected' }),
        incrementReplayCount: async () => undefined,
      },
    });
    assert.equal(result.outcome, 'NACK');
    assert.equal(result.queueResult.classification, 'POLICY_BLOCKED');
  }
});

test('missing source and invalid stored payload fail safely', async () => {
  const missing = await executeMetaSocialReplayJob({
    claim: replayClaim(),
    dependencies: {
      getAudit: async () => null,
      enqueue: async () => ({ auditId: 'unexpected' }),
      incrementReplayCount: async () => undefined,
    },
  });
  assert.equal(missing.outcome, 'NACK');
  assert.equal(missing.queueResult.safeReasonCode, 'META_SOCIAL_REPLAY_SOURCE_NOT_FOUND');

  const invalid = await executeMetaSocialReplayJob({
    claim: replayClaim(),
    dependencies: {
      getAudit: async () => originalAudit({ payload: { type: 'broken' } }),
      enqueue: async () => ({ auditId: 'unexpected' }),
      incrementReplayCount: async () => undefined,
    },
  });
  assert.equal(invalid.outcome, 'NACK');
  assert.equal(invalid.queueResult.classification, 'PERMANENT');
  assert.equal(invalid.queueResult.safeReasonCode, 'META_SOCIAL_REPLAY_STORED_PAYLOAD_INVALID');
});
