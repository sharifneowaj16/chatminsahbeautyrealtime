import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createBullMqSocialQueueAdapter } from '../../lib/meta-platform/queue/bullmq-social-adapter.ts';
import {
  createMetaSocialQueueClaim,
  nackMetaSocialQueueJob,
} from '../../lib/meta-platform/queue/social-queue-adapter.ts';
import {
  decideMetaSocialJobFailure,
  getMetaSocialRetryDelayMs,
} from '../../lib/meta-platform/queue/social-job-reliability.ts';
import {
  createMetaSocialReplayJobEnvelope,
  executeMetaSocialReplayJob,
} from '../../lib/meta-platform/queue/social-replay-job.ts';
import { META_SOCIAL_JOB_TYPES } from '../../lib/meta-platform/queue/social-job-types.ts';
import { createMetaSocialJobEnvelope } from '../../lib/meta-platform/queue/social-job-envelope.ts';
import { metaSocialJobDedupePrefix } from '../../lib/meta-platform/queue/social-job-types.ts';
import { InMemoryMetaSocialWebhookReceiptStore } from '../../lib/meta-platform/repositories/webhook-receipts.ts';

const NOW = new Date('2026-07-25T20:00:00.000Z');
const DIGEST = 'a'.repeat(64);

function receiptInput(overrides = {}) {
  return {
    platform: 'INSTAGRAM',
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    providerDeliveryId: 'delivery-1',
    providerEventKey: 'instagram:message:mid-1',
    payloadDigest: DIGEST,
    correlationId: 'meta-webhook:layer4-gate-00000001',
    receivedAt: NOW,
    safeMetadata: {
      objectType: 'instagram',
      eventType: 'MESSAGE',
      routingTarget: 'INSTAGRAM',
      accountId: 'ig-account-1',
      platformMessageId: 'mid-1',
      signatureOk: true,
    },
    ...overrides,
  };
}

function inboundEnvelope() {
  return createMetaSocialJobEnvelope({
    jobType: 'PROCESS_INSTAGRAM_INBOUND',
    receiptId: 'receipt-1',
    correlationId: 'social-job:layer4-gate-00000001',
    scheduledAt: NOW,
    dedupeKey: `${metaSocialJobDedupePrefix('PROCESS_INSTAGRAM_INBOUND')}layer4-gate`,
    payloadRef: {
      kind: 'WEBHOOK_RECEIPT',
      id: 'receipt-1',
      providerObjectId: 'mid-1',
      scope: { accountId: 'ig-account-1' },
    },
    observability: {
      component: 'phase31-layer4-gate',
      operation: 'process-instagram-inbound',
      platform: 'INSTAGRAM',
      environment: 'PRODUCTION',
    },
  });
}

function originalAudit(overrides = {}) {
  const socialEnvelope = createMetaSocialJobEnvelope({
    jobType: 'PROCESS_INSTAGRAM_INBOUND',
    receiptId: 'receipt-1',
    correlationId: 'social-job:original-00000001',
    scheduledAt: NOW,
    dedupeKey: `${metaSocialJobDedupePrefix('PROCESS_INSTAGRAM_INBOUND')}original`,
    payloadRef: {
      kind: 'WEBHOOK_RECEIPT',
      id: 'receipt-1',
      providerObjectId: 'mid-1',
      scope: { accountId: 'ig-account-1' },
    },
    observability: {
      component: 'phase31-layer4-gate',
      operation: 'process-instagram-inbound',
      platform: 'INSTAGRAM',
      environment: 'PRODUCTION',
    },
  });
  return {
    id: 'audit-original-1',
    queueName: 'meta-instagram',
    jobName: 'instagram-message',
    externalJobId: 'job-original-1',
    idempotencyKey: socialEnvelope.dedupeKey,
    correlationId: socialEnvelope.correlationId,
    status: 'DEAD_LETTER',
    attempts: 5,
    maxAttempts: 5,
    progress: 0,
    sourceId: 'receipt-1',
    payload: {
      schemaVersion: 1,
      idempotencyKey: socialEnvelope.dedupeKey,
      requestedAt: NOW.toISOString(),
      correlationId: socialEnvelope.correlationId,
      sourceId: 'receipt-1',
      auditId: 'audit-original-1',
      type: 'instagram_message',
      receiptId: 'receipt-1',
      socialEnvelope,
    },
    lastError: { code: 'META_PROVIDER_TEMPORARY', classification: 'TRANSIENT' },
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

function replayClaim() {
  const envelope = createMetaSocialReplayJobEnvelope({
    originalAuditId: 'audit-original-1',
    approvalId: 'approval-1',
    correlationId: 'social-job:replay-00000001',
    scheduledAt: NOW,
  });
  return createMetaSocialQueueClaim({
    queueName: 'meta-social',
    jobName: 'social-event-replay',
    jobId: 'replay-request-job-1',
    auditId: 'replay-request-audit-1',
    deliveryAttempt: 1,
    claimedAt: NOW,
    envelope,
  });
}

test('queue outage preserves the durable envelope and returns a recoverable deferred result', async () => {
  const adapter = createBullMqSocialQueueAdapter({
    now: () => NOW,
    unavailableRetryMs: 45_000,
    enqueueMetaJob: async () => {
      throw Object.assign(new Error('Redis ECONNREFUSED'), { code: 'ECONNREFUSED' });
    },
  });
  const envelope = inboundEnvelope();
  const result = await adapter.enqueue(envelope);
  assert.equal(result.outcome, 'DEFERRED');
  assert.equal(result.accepted, false);
  assert.equal(result.recoverable, true);
  assert.equal(result.code, 'SOCIAL_QUEUE_UNAVAILABLE');
  assert.equal(result.retryAt, new Date(NOW.getTime() + 45_000).toISOString());
  assert.deepEqual(result.envelope, envelope);
});

test('worker crash recovery reclaims an expired receipt lease and fences the stale worker', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({
    receiptId: created.receipt.id,
    queueName: 'meta-instagram',
    jobReference: 'social:process-instagram-inbound:layer4-gate',
    actor: 'webhook-handoff',
    now: NOW,
  });
  const first = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'instagram-worker-1',
    leaseMs: 5_000,
    now: NOW,
  });
  const reclaimed = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'instagram-worker-2',
    leaseMs: 5_000,
    now: new Date(NOW.getTime() + 5_001),
  });
  assert.equal(reclaimed.reclaimed, true);
  assert.equal(reclaimed.receipt.attemptCount, 2);
  assert.notEqual(reclaimed.leaseToken, first.leaseToken);
  assert.throws(() => store.markProcessed({
    receiptId: created.receipt.id,
    leaseToken: first.leaseToken,
    actor: 'instagram-worker-1',
  }), /does not belong/);
  assert.equal(store.markProcessed({
    receiptId: created.receipt.id,
    leaseToken: reclaimed.leaseToken,
    actor: 'instagram-worker-2',
    now: new Date(NOW.getTime() + 5_100),
  }).state, 'PROCESSED');
});

test('retry scheduling is deterministic, exponential and honors provider Retry-After', () => {
  const first = getMetaSocialRetryDelayMs({ attempt: 1, dedupeKey: 'social:layer4:retry' });
  const same = getMetaSocialRetryDelayMs({ attempt: 1, dedupeKey: 'social:layer4:retry' });
  const second = getMetaSocialRetryDelayMs({ attempt: 2, dedupeKey: 'social:layer4:retry' });
  assert.equal(first, same);
  assert.ok(second > first);
  assert.equal(getMetaSocialRetryDelayMs({
    attempt: 1,
    dedupeKey: 'social:layer4:retry-after',
    retryAfterMs: 180_000,
  }), 180_000);
});

test('retry exhaustion and permanent failures converge to dead-letter', () => {
  const exhausted = decideMetaSocialJobFailure({
    nack: nackMetaSocialQueueJob({ classification: 'TRANSIENT', safeReasonCode: 'META_PROVIDER_TEMPORARY' }),
    dedupeKey: 'social:layer4:exhausted',
    attempt: 5,
    maxAttempts: 5,
    now: NOW,
  });
  assert.equal(exhausted.action, 'DEAD_LETTER');
  assert.equal(exhausted.safeReasonCode, 'META_SOCIAL_RETRY_EXHAUSTED');

  const permanent = decideMetaSocialJobFailure({
    nack: nackMetaSocialQueueJob({ classification: 'PERMANENT', safeReasonCode: 'META_PROVIDER_OBJECT_INVALID' }),
    dedupeKey: 'social:layer4:permanent',
    attempt: 1,
    maxAttempts: 5,
    now: NOW,
  });
  assert.equal(permanent.action, 'DEAD_LETTER');
  assert.equal(permanent.retryDelayMs, null);
});

test('possible-success provider writes require reconciliation and never enter blind retry', () => {
  const decision = decideMetaSocialJobFailure({
    nack: nackMetaSocialQueueJob({
      classification: 'UNKNOWN_WRITE',
      safeReasonCode: 'META_WRITE_OUTCOME_UNKNOWN',
      reconciliationRequired: true,
    }),
    dedupeKey: 'social:layer4:unknown-write',
    attempt: 1,
    maxAttempts: 5,
    now: NOW,
  });
  assert.equal(decision.action, 'RECONCILE');
  assert.equal(decision.reconciliationRequired, true);
  assert.equal(decision.retryAt, null);
});

test('approved replay creates one audited child job with a fresh dedupe key', async () => {
  const source = originalAudit();
  const enqueued = [];
  let replayCount = 0;
  const result = await executeMetaSocialReplayJob({
    claim: replayClaim(),
    requestedBy: 'admin-1',
    now: NOW,
    dependencies: {
      getAudit: async () => source,
      enqueue: async (input) => {
        enqueued.push(input);
        return { auditId: 'audit-replayed-1', jobId: 'job-replayed-1' };
      },
      incrementReplayCount: async () => { replayCount += 1; },
    },
  });
  assert.equal(result.outcome, 'ACK');
  assert.equal(enqueued.length, 1);
  assert.equal(replayCount, 1);
  assert.equal(enqueued[0].replayOfId, source.id);
  assert.notEqual(enqueued[0].payload.idempotencyKey, source.idempotencyKey);
  assert.equal(enqueued[0].payload.socialEnvelope.observability.parentAuditId, source.id);
});

test('unreconciled unknown provider outcomes cannot be replayed', async () => {
  let enqueued = false;
  const result = await executeMetaSocialReplayJob({
    claim: replayClaim(),
    dependencies: {
      getAudit: async () => originalAudit({
        lastError: { code: 'META_WRITE_OUTCOME_UNKNOWN', reconciliationRequired: true },
      }),
      enqueue: async () => { enqueued = true; return { auditId: 'unexpected' }; },
      incrementReplayCount: async () => undefined,
    },
  });
  assert.equal(result.outcome, 'NACK');
  assert.equal(result.queueResult.classification, 'UNKNOWN_WRITE');
  assert.equal(result.queueResult.reconciliationRequired, true);
  assert.equal(enqueued, false);
});

test('all canonical jobs remain exactly eight durable-reference types', () => {
  assert.equal(META_SOCIAL_JOB_TYPES.length, 8);
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
});


test('Instagram queue handoff failures have a scheduled durable recovery path', async () => {
  const jobTypes = await readFile(new URL('../../lib/jobs/job-types.ts', import.meta.url), 'utf8');
  const scheduler = await readFile(new URL('../../lib/jobs/scheduler.ts', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../../workers/meta-instagram.worker.ts', import.meta.url), 'utf8');
  const service = await readFile(new URL('../../lib/meta/instagram/messages.ts', import.meta.url), 'utf8');
  assert.match(jobTypes, /INSTAGRAM_RECEIPT_RECOVERY: 'instagram-receipt-recovery'/);
  assert.match(scheduler, /instagram-receipt-recovery-5m/);
  assert.match(worker, /runInstagramReceiptRecovery/);
  assert.match(service, /QUEUE_HANDOFF_FAILED/);
  assert.match(service, /errorData: \{ path: \['code'\], equals: 'QUEUE_HANDOFF_FAILED' \}/);
});

test('single-container and dedicated-process startup both include every Layer 4 worker', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const workerAll = packageJson.scripts['worker:all'];
  for (const script of ['worker:meta-lead', 'worker:meta-instagram', 'worker:meta-social', 'worker:meta-scheduler']) {
    assert.match(workerAll, new RegExp(`npm run ${script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }

  const instrumentation = await readFile(new URL('../../instrumentation.ts', import.meta.url), 'utf8');
  for (const starter of ['startMetaLeadWorker', 'startMetaInstagramWorker', 'startMetaSocialWorker', 'startMetaSchedulerWorker']) {
    assert.match(instrumentation, new RegExp(starter));
  }
  assert.match(instrumentation, /DISABLE_EMBEDDED_WORKERS/);
});
