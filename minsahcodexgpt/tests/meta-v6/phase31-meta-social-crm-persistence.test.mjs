import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InMemoryMetaSocialWebhookReceiptStore,
  resolveMetaPlatformEnvironment,
  resolveMetaSocialConnectionKey,
  sanitizeMetaSocialWebhookMetadata,
} from '../../lib/meta-platform/repositories/webhook-receipts.ts';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

function receiptInput(overrides = {}) {
  return {
    platform: 'LEAD_ADS',
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    providerDeliveryId: 'lead-1',
    providerEventKey: 'leadgen:page-1:form-1:lead-1',
    payloadDigest: DIGEST_A,
    correlationId: 'meta-webhook:aaaaaaaaaaaaaaaaaaaaaaaa',
    receivedAt: new Date('2026-07-24T17:00:00.000Z'),
    safeMetadata: {
      objectType: 'page',
      eventType: 'LEADGEN',
      routingTarget: 'LEAD_ADS',
      pageId: 'page-1',
      formId: 'form-1',
      leadgenId: 'lead-1',
      signatureOk: true,
    },
    ...overrides,
  };
}

test('first canonical receipt creates one durable identity with RECEIVED state', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const result = await store.createOrGet(receiptInput());
  assert.equal(result.created, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.digestMatches, true);
  assert.equal(result.receipt.state, 'RECEIVED');
  assert.equal(result.receipt.duplicateCount, 0);
  assert.equal(store.snapshot().length, 1);
});

test('same scoped provider event creates no second row and increments duplicate metadata', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const first = await store.createOrGet(receiptInput());
  const duplicate = await store.createOrGet(receiptInput({ receivedAt: new Date('2026-07-24T17:01:00.000Z') }));
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.receipt.id, first.receipt.id);
  assert.equal(duplicate.receipt.duplicateCount, 1);
  assert.equal(duplicate.receipt.lastSeenAt.toISOString(), '2026-07-24T17:01:00.000Z');
  assert.equal(store.snapshot().length, 1);
});

test('same event key in another connection does not collide', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  await store.createOrGet(receiptInput());
  await store.createOrGet(receiptInput({ connectionKey: 'secondary' }));
  assert.equal(store.snapshot().length, 2);
});

test('same event key in another environment does not collide', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  await store.createOrGet(receiptInput());
  await store.createOrGet(receiptInput({ environment: 'STAGING' }));
  assert.equal(store.snapshot().length, 2);
});

test('same provider key with a changed payload digest is surfaced without creating a row', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const first = await store.createOrGet(receiptInput());
  const mismatch = await store.createOrGet(receiptInput({ payloadDigest: DIGEST_B }));
  assert.equal(mismatch.created, false);
  assert.equal(mismatch.digestMatches, false);
  assert.equal(mismatch.receipt.id, first.receipt.id);
  assert.equal(mismatch.receipt.payloadDigest, DIGEST_A);
  assert.equal(mismatch.receipt.lastPayloadDigest, DIGEST_B);
  assert.equal(mismatch.receipt.digestMismatchCount, 1);
  assert.equal(store.snapshot().length, 1);
});

test('safe metadata projection drops raw tokens, PII, message text and nested payloads', () => {
  const safe = sanitizeMetaSocialWebhookMetadata({
    objectType: 'instagram',
    accountId: 'ig-1',
    platformMessageId: 'mid-1',
    access_token: 'secret-token',
    app_secret: 'secret-app',
    authorization: 'Bearer secret',
    email: 'person@example.com',
    phone: '+8801700000000',
    text: 'private message body',
    rawPayload: { message: 'private' },
  });
  assert.deepEqual(safe, {
    objectType: 'instagram',
    accountId: 'ig-1',
    platformMessageId: 'mid-1',
  });
  const serialized = JSON.stringify(safe);
  for (const forbidden of ['secret-token', 'secret-app', 'person@example.com', '+8801700000000', 'private message body']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('invalid state and replay metadata fail closed', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  await assert.rejects(
    store.createOrGet(receiptInput({ initialState: 'VERIFIED' })),
    /META_SOCIAL_WEBHOOK_STATE_INVALID/,
  );
  await assert.rejects(
    store.createOrGet(receiptInput({ initialState: 'PROCESSED' })),
    /META_SOCIAL_WEBHOOK_INITIAL_STATE_INVALID/,
  );
  await assert.rejects(
    store.createOrGet(receiptInput({ replayAttempt: 1 })),
    /META_SOCIAL_WEBHOOK_REPLAY_PARENT_REQUIRED/,
  );
});

test('environment and connection resolution are deterministic and reject invalid values', () => {
  assert.equal(resolveMetaPlatformEnvironment({ NODE_ENV: 'production' }), 'PRODUCTION');
  assert.equal(resolveMetaPlatformEnvironment({ META_PLATFORM_ENVIRONMENT: 'staging' }), 'STAGING');
  assert.equal(resolveMetaSocialConnectionKey({}), 'primary');
  assert.equal(resolveMetaSocialConnectionKey({ META_CONNECTION_NAME: 'social-primary' }), 'social-primary');
  assert.throws(
    () => resolveMetaPlatformEnvironment({ META_PLATFORM_ENVIRONMENT: 'preview' }),
    /META_SOCIAL_WEBHOOK_ENVIRONMENT_INVALID/,
  );
  assert.throws(
    () => resolveMetaSocialConnectionKey({ META_CONNECTION_NAME: 'not valid' }),
    /META_SOCIAL_WEBHOOK_CONNECTION_KEY_INVALID/,
  );
});

test('transition matrix exposes only the Layer 3.3 guarded lifecycle', async () => {
  const { canTransitionMetaSocialWebhookReceipt, isTerminalMetaSocialWebhookReceiptState } = await import(
    '../../lib/meta-platform/repositories/webhook-receipt-transitions.ts'
  );
  assert.equal(canTransitionMetaSocialWebhookReceipt('RECEIVED', 'QUEUED'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('RECEIVED', 'BLOCKED'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('QUEUED', 'PROCESSING'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('PROCESSING', 'PROCESSED'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('PROCESSING', 'FAILED'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('FAILED', 'QUEUED'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('FAILED', 'DEAD_LETTERED'), true);
  assert.equal(canTransitionMetaSocialWebhookReceipt('PROCESSED', 'PROCESSING'), false);
  assert.equal(canTransitionMetaSocialWebhookReceipt('BLOCKED', 'QUEUED'), false);
  assert.equal(isTerminalMetaSocialWebhookReceiptState('DEAD_LETTERED'), true);
});

test('queue transition is guarded and same queue reference is idempotent', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  const queued = store.markQueued({
    receiptId: created.receipt.id,
    queueName: 'meta-leads',
    jobReference: 'job-1',
    actor: 'webhook-handoff',
    now: new Date('2026-07-24T17:02:00.000Z'),
  });
  assert.equal(queued.receipt.state, 'QUEUED');
  assert.equal(queued.idempotent, false);
  assert.equal(queued.receipt.stateVersion, 1);
  const duplicate = store.markQueued({
    receiptId: created.receipt.id,
    queueName: 'meta-leads',
    jobReference: 'job-1',
    actor: 'webhook-handoff',
    now: new Date('2026-07-24T17:03:00.000Z'),
  });
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.receipt.stateVersion, 1);
  assert.throws(() => store.markQueued({
    receiptId: created.receipt.id,
    queueName: 'meta-leads',
    jobReference: 'job-conflict',
    actor: 'webhook-handoff',
  }), /another queue reference/);
});

test('two workers cannot own one active receipt lease', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const first = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'lead-worker-1',
    now: new Date('2026-07-24T17:05:00.000Z'),
    leaseMs: 60_000,
  });
  assert.equal(first.receipt.state, 'PROCESSING');
  assert.equal(first.receipt.attemptCount, 1);
  assert.equal(first.reclaimed, false);
  assert.throws(() => store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'lead-worker-2',
    now: new Date('2026-07-24T17:05:30.000Z'),
    leaseMs: 60_000,
  }), /active processing lease/);
});

test('expired processing lease is reclaimed and stale worker completion is fenced', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const first = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'lead-worker-1',
    now: new Date('2026-07-24T17:05:00.000Z'),
    leaseMs: 5_000,
  });
  const reclaimed = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'lead-worker-2',
    now: new Date('2026-07-24T17:05:06.000Z'),
    leaseMs: 5_000,
  });
  assert.equal(reclaimed.reclaimed, true);
  assert.equal(reclaimed.receipt.attemptCount, 2);
  assert.notEqual(reclaimed.leaseToken, first.leaseToken);
  assert.throws(() => store.markProcessed({
    receiptId: created.receipt.id,
    leaseToken: first.leaseToken,
    actor: 'lead-worker-1',
  }), /does not belong/);
  const processed = store.markProcessed({
    receiptId: created.receipt.id,
    leaseToken: reclaimed.leaseToken,
    actor: 'lead-worker-2',
    now: new Date('2026-07-24T17:05:07.000Z'),
  });
  assert.equal(processed.state, 'PROCESSED');
  assert.equal(processed.leaseToken, null);
});

test('active lease can renew but an expired or foreign lease cannot', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const claim = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'lead-worker-1',
    now: new Date('2026-07-24T17:05:00.000Z'),
    leaseMs: 10_000,
  });
  const renewed = store.renewLease({
    receiptId: created.receipt.id,
    leaseToken: claim.leaseToken,
    leaseOwner: 'lead-worker-1',
    now: new Date('2026-07-24T17:05:05.000Z'),
    leaseMs: 20_000,
  });
  assert.equal(renewed.leaseExpiresAt?.toISOString(), '2026-07-24T17:05:25.000Z');
  assert.throws(() => store.renewLease({
    receiptId: created.receipt.id,
    leaseToken: claim.leaseToken,
    leaseOwner: 'other-worker',
    now: new Date('2026-07-24T17:05:06.000Z'),
  }), /does not belong/);
});

test('retryable failure clears lease, redacts summary and can only requeue when due', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const claim = store.claim({
    receiptId: created.receipt.id,
    leaseOwner: 'lead-worker-1',
    now: new Date('2026-07-24T17:05:00.000Z'),
  });
  const failed = store.markFailed({
    receiptId: created.receipt.id,
    leaseToken: claim.leaseToken,
    failureCode: 'META_PROVIDER_UNAVAILABLE',
    failureCategory: 'TRANSIENT_PROVIDER',
    failureSummary: 'Bearer abcdefghijklmnopqrstuvwxyz person@example.com +8801700000000',
    nextRetryAt: new Date('2026-07-24T17:10:00.000Z'),
    actor: 'lead-worker-1',
    now: new Date('2026-07-24T17:05:01.000Z'),
  });
  assert.equal(failed.state, 'FAILED');
  assert.equal(failed.leaseToken, null);
  assert.equal(failed.failureSummary?.includes('person@example.com'), false);
  assert.equal(failed.failureSummary?.includes('+8801700000000'), false);
  assert.throws(() => store.requeueFailed({
    receiptId: created.receipt.id,
    actor: 'retry-scheduler',
    now: new Date('2026-07-24T17:09:59.000Z'),
  }), /not due/);
  const requeued = store.requeueFailed({
    receiptId: created.receipt.id,
    actor: 'retry-scheduler',
    now: new Date('2026-07-24T17:10:00.000Z'),
  });
  assert.equal(requeued.state, 'QUEUED');
  assert.equal(requeued.nextRetryAt, null);
});

test('failed receipt can dead-letter but terminal receipt cannot be reopened', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput());
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const claim = store.claim({ receiptId: created.receipt.id, leaseOwner: 'lead-worker-1' });
  store.markFailed({
    receiptId: created.receipt.id,
    leaseToken: claim.leaseToken,
    failureCode: 'META_PERMISSION_REVOKED',
    failureCategory: 'AUTHORIZATION',
    actor: 'lead-worker-1',
  });
  const dead = store.markDeadLettered({
    receiptId: created.receipt.id,
    failureCode: 'RETRY_EXHAUSTED',
    failureSummary: 'Manual review required.',
    actor: 'retry-controller',
  });
  assert.equal(dead.state, 'DEAD_LETTERED');
  assert.throws(() => store.requeueFailed({ receiptId: dead.id, actor: 'retry-controller' }), /cannot transition/);
});

test('controlled replay creates an audited child and is idempotent per request key', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const created = await store.createOrGet(receiptInput({
    legacyReceiptType: 'MetaLeadWebhookReceipt',
    legacyReceiptId: 'legacy-receipt-1',
  }));
  store.markQueued({ receiptId: created.receipt.id, queueName: 'meta-leads', jobReference: 'job-1', actor: 'handoff' });
  const claim = store.claim({ receiptId: created.receipt.id, leaseOwner: 'lead-worker-1' });
  store.markFailed({
    receiptId: created.receipt.id,
    leaseToken: claim.leaseToken,
    failureCode: 'META_PROVIDER_UNAVAILABLE',
    failureCategory: 'TRANSIENT_PROVIDER',
    actor: 'lead-worker-1',
  });
  store.markDeadLettered({ receiptId: created.receipt.id, failureCode: 'RETRY_EXHAUSTED', actor: 'retry-controller' });
  const approval = {
    approvalId: 'approval-123',
    approvedBy: 'admin-84',
    approvedAt: new Date('2026-07-24T17:59:00.000Z'),
    approvalReference: 'META_SOCIAL_WEBHOOK_REPLAY:approval-123',
  };
  const first = await store.createReplayAttempt({
    originalReceiptId: created.receipt.id,
    replayRequestKey: 'approval-ticket-123',
    reason: 'Provider access restored.',
    actor: 'admin-42',
    ...approval,
    now: new Date('2026-07-24T18:00:00.000Z'),
  });
  const duplicate = await store.createReplayAttempt({
    originalReceiptId: created.receipt.id,
    replayRequestKey: 'approval-ticket-123',
    reason: 'Provider access restored.',
    actor: 'admin-42',
    ...approval,
    now: new Date('2026-07-24T18:01:00.000Z'),
  });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(first.receipt.id, duplicate.receipt.id);
  assert.equal(first.receipt.parentReceiptId, created.receipt.id);
  assert.equal(first.receipt.replayAttempt, 1);
  assert.equal(first.receipt.state, 'RECEIVED');
  assert.equal(store.getById(created.receipt.id)?.state, 'DEAD_LETTERED');
});

test('blocked and processed receipts are terminal', async () => {
  const store = new InMemoryMetaSocialWebhookReceiptStore();
  const blocked = await store.createOrGet(receiptInput({
    providerEventKey: 'blocked-event',
    initialState: 'BLOCKED',
  }));
  assert.throws(() => store.markQueued({
    receiptId: blocked.receipt.id,
    queueName: 'meta-leads',
    jobReference: 'job-blocked',
    actor: 'handoff',
  }), /cannot transition/);

  const normal = await store.createOrGet(receiptInput({ providerEventKey: 'processed-event' }));
  store.markQueued({ receiptId: normal.receipt.id, queueName: 'meta-leads', jobReference: 'job-processed', actor: 'handoff' });
  const claim = store.claim({ receiptId: normal.receipt.id, leaseOwner: 'lead-worker-1' });
  store.markProcessed({ receiptId: normal.receipt.id, leaseToken: claim.leaseToken, actor: 'lead-worker-1' });
  assert.throws(() => store.claim({ receiptId: normal.receipt.id, leaseOwner: 'lead-worker-2' }), /cannot transition/);
});
