import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetaPlatformError } from '../../lib/meta-platform/core/errors';
import { createMetaInvocationContext } from '../../lib/meta-platform/core/context';
import {
  InMemoryMetaCircuitStateStore,
  InMemoryMetaRateLimitStateStore,
  InMemoryMetaReadCacheStore,
  MetaCircuitBreakerRegistry,
  MetaQueueAdmissionController,
  MetaRateLimiter,
  MetaRetryPolicy,
  StaticMetaQueueDepthProvider,
  executeMetaReadWithStaleFallback,
  parseMetaProviderUsageHeaders,
  type MetaReliabilityScope,
} from '../../lib/meta-platform/reliability/index';
import {
  InMemoryMetaOperationStore,
  MetaOperationDispatcher,
  MetaOperationHandlerRegistry,
  MetaOperationService,
  MetaPayloadCodecRegistry,
  createMetaVersionedPayload,
  executeMetaOperation,
} from '../../lib/meta-platform/operations/index';

const scope: MetaReliabilityScope = Object.freeze({
  environment: 'STAGING',
  connectionKey: 'primary',
  capability: 'capi',
  operation: 'purchase.send',
  priority: 'P0',
  kind: 'WRITE',
  assetType: 'PIXEL',
  assetId: 'pixel-1',
});

function retryableError(category: 'RATE_LIMIT' | 'DEPENDENCY_UNAVAILABLE' | 'TIMEOUT' = 'DEPENDENCY_UNAVAILABLE') {
  return createMetaPlatformError({
    code: category === 'RATE_LIMIT' ? 'META_GRAPH_RATE_LIMITED' : 'META_GRAPH_DEPENDENCY_UNAVAILABLE',
    category,
    message: 'Provider unavailable.',
    retryable: true,
  });
}

function operationRegistry() {
  return new MetaPayloadCodecRegistry().register({
    type: 'capi.purchase',
    schemaVersion: 1,
    decode(data) {
      if (!data || typeof data !== 'object' || typeof (data as { eventId?: unknown }).eventId !== 'string') throw new Error('eventId required');
      return data as { eventId: string };
    },
  });
}

function command(input: { readonly priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4'; readonly expiresAt?: Date; readonly idempotencyKey?: string } = {}) {
  return {
    environment: 'STAGING' as const,
    connectionKey: 'primary',
    capability: 'capi',
    operationType: 'capi.purchase',
    idempotencyKey: input.idempotencyKey ?? `purchase:${input.priority ?? 'P2'}`,
    credentialRole: 'CAPI' as const,
    assetType: 'PIXEL' as const,
    assetId: 'pixel-1',
    priority: input.priority,
    expiresAt: input.expiresAt ?? new Date(Date.now() + 60 * 60_000),
    invocation: createMetaInvocationContext({ correlationId: 'phase26-test', actor: { type: 'SYSTEM' } }),
    payload: createMetaVersionedPayload({ type: 'capi.purchase', schemaVersion: 1, data: { eventId: 'evt-1' } }),
  };
}

test('provider retry-after overrides exponential jitter and unsafe unknown writes reconcile', () => {
  const usage = parseMetaProviderUsageHeaders({
    'retry-after': '120',
    'x-app-usage': JSON.stringify({ call_count: 95, total_cputime: 60, total_time: 70 }),
  }, new Date('2026-07-22T16:00:00.000Z'));
  assert.equal(usage.retryAfterMs, 120_000);
  assert.equal(usage.appUsagePercent, 95);
  const policy = new MetaRetryPolicy({ random: () => 0 });
  const decision = policy.decide({ error: retryableError('RATE_LIMIT'), attempt: 2, priority: 'P1', idempotent: true, providerUsage: usage, now: new Date('2026-07-22T16:00:00.000Z'), expiresAt: new Date('2026-07-22T17:00:00.000Z') });
  assert.equal(decision.action, 'DEFER');
  assert.equal(decision.reason, 'PROVIDER_RETRY_AFTER');
  assert.equal(decision.delayMs, 120_000);

  const unsafe = policy.decide({ error: retryableError('TIMEOUT'), attempt: 1, priority: 'P0', idempotent: false, requestMayHaveSucceeded: true });
  assert.equal(unsafe.action, 'RECONCILE');
  assert.equal(unsafe.error.category, 'RECONCILIATION_REQUIRED');
});

test('circuit opens, permits exactly one distributed half-open probe and recovers', async () => {
  const store = new InMemoryMetaCircuitStateStore();
  const breaker = new MetaCircuitBreakerRegistry({ store, failureThreshold: 2, openDurationMs: 1_000, probeLeaseMs: 5_000, probeOwner: 'worker-a' });
  const first = await breaker.acquire(scope, new Date('2026-07-22T16:00:00.000Z'));
  await breaker.recordFailure(first, { retryable: true, now: new Date('2026-07-22T16:00:00.000Z') });
  const second = await breaker.acquire(scope, new Date('2026-07-22T16:00:00.100Z'));
  await breaker.recordFailure(second, { retryable: true, now: new Date('2026-07-22T16:00:00.100Z') });
  await assert.rejects(() => breaker.acquire(scope, new Date('2026-07-22T16:00:00.500Z')), /circuit is open/i);

  const settled = await Promise.allSettled([
    breaker.acquire(scope, new Date('2026-07-22T16:00:01.200Z')),
    breaker.acquire(scope, new Date('2026-07-22T16:00:01.200Z')),
  ]);
  assert.equal(settled.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(settled.filter((result) => result.status === 'rejected').length, 1);
  const probe = (settled.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof breaker.acquire>>>).value;
  assert.equal(probe.state, 'HALF_OPEN');
  await breaker.recordSuccess(probe, new Date('2026-07-22T16:00:01.300Z'));
  assert.equal((await breaker.snapshot(scope)).state, 'CLOSED');
});

test('distributed rate limiter enforces app, capability and asset budgets and provider cooldown', async () => {
  const store = new InMemoryMetaRateLimitStateStore();
  const limiter = new MetaRateLimiter({ store, capacity: 1, refillPerSecond: 0.001, providerCooldownMs: 30_000 });
  const budgets = await limiter.acquire(scope, { now: new Date('2026-07-22T16:00:00.000Z') });
  assert.equal(budgets.length, 3);
  await assert.rejects(() => limiter.acquire(scope, { now: new Date('2026-07-22T16:00:00.100Z') }), /rate limiter/i);
  await limiter.observeProviderUsage(scope, { appUsagePercent: 99 }, new Date('2026-07-22T16:00:01.000Z'));
  assert.ok((await limiter.inspect(scope, new Date('2026-07-22T16:00:02.000Z'))).every((budget) => !budget.allowed));
});

test('queue admission isolates critical priority from lower-priority saturation', async () => {
  const provider = new StaticMetaQueueDepthProvider({ total: 85, byPriority: { P0: 1, P1: 4, P2: 20, P3: 30, P4: 30 } });
  const admission = new MetaQueueAdmissionController({ provider, maxDepth: 100, retryDelayMs: 10_000 });
  assert.equal((await admission.decide({ priority: 'P2' })).admitted, true);
  assert.equal((await admission.decide({ priority: 'P3' })).admitted, false);
  provider.set({ total: 105, byPriority: { P0: 2, P1: 5, P2: 28, P3: 35, P4: 35 } });
  assert.equal((await admission.decide({ priority: 'P0' })).admitted, true);
  assert.equal((await admission.decide({ priority: 'P1' })).admitted, false);
});

test('read policy returns stale cache only inside the stale window', async () => {
  const cache = new InMemoryMetaReadCacheStore();
  const first = await executeMetaReadWithStaleFallback({ key: 'insights:1', cache, freshTtlMs: 1_000, staleTtlMs: 10_000, now: new Date('2026-07-22T16:00:00.000Z'), load: async () => ({ spend: 12 }) });
  assert.equal(first.source, 'PROVIDER');
  const stale = await executeMetaReadWithStaleFallback({ key: 'insights:1', cache, freshTtlMs: 1_000, staleTtlMs: 10_000, now: new Date('2026-07-22T16:00:02.000Z'), load: async () => { throw retryableError(); } });
  assert.equal(stale.source, 'STALE_FALLBACK');
  assert.equal(stale.stale, true);
  await assert.rejects(() => executeMetaReadWithStaleFallback({ key: 'insights:1', cache, freshTtlMs: 1_000, staleTtlMs: 10_000, now: new Date('2026-07-22T16:00:11.000Z'), load: async () => { throw retryableError(); } }));
});

test('outbox claims P0 before P4 regardless of insertion order', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: operationRegistry() });
  await service.commit(command({ priority: 'P4', idempotencyKey: 'low' }));
  await service.commit(command({ priority: 'P0', idempotencyKey: 'critical' }));
  const batch = await store.claimDueOutbox({ limit: 2 });
  assert.deepEqual(batch.messages.map((message) => message.priority), ['P0', 'P4']);
});

test('queue backpressure durably defers an outbox message instead of dropping it', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: operationRegistry() });
  const committed = await service.commit(command({ priority: 'P3', idempotencyKey: 'backpressure' }));
  const provider = new StaticMetaQueueDepthProvider({ total: 100, byPriority: { P0: 1, P1: 4, P2: 20, P3: 35, P4: 40 } });
  const dispatcher = new MetaOperationDispatcher({
    store,
    payloadRegistry: operationRegistry(),
    publisher: { publish: async () => { throw new Error('must not publish'); } },
    admission: new MetaQueueAdmissionController({ provider, maxDepth: 100, retryDelayMs: 5_000 }),
    now: () => new Date('2026-07-22T16:00:00.000Z'),
  });
  const summary = await dispatcher.dispatchDue();
  assert.equal(summary.backpressured, 1);
  assert.equal(summary.deferred, 1);
  const outbox = await store.getOutboxMessage(committed.outbox.id);
  assert.equal(outbox?.state, 'RETRY_SCHEDULED');
  assert.equal((await store.getOperation(committed.operation.id))?.status, 'ACCEPTED');
});

test('retryable idempotent execution failure creates durable defer and later succeeds', async () => {
  const store = new InMemoryMetaOperationStore();
  const registry = operationRegistry();
  const service = new MetaOperationService({ store, payloadRegistry: registry });
  const committed = await service.commit(command({ priority: 'P0', idempotencyKey: 'retryable' }));
  await new MetaOperationDispatcher({ store, payloadRegistry: registry, publisher: { publish: async () => ({ externalMessageId: 'job-1' }) } }).dispatchDue();

  let calls = 0;
  const handlers = new MetaOperationHandlerRegistry().register('capi.purchase', {
    idempotent: true,
    async execute() {
      calls += 1;
      if (calls === 1) throw retryableError();
      return { eventId: 'evt-1', accepted: true };
    },
  });
  const first = await executeMetaOperation({ operationId: committed.operation.id, store, payloadRegistry: registry, handlerRegistry: handlers, retryPolicy: new MetaRetryPolicy({ random: () => 0 }), now: () => new Date() });
  assert.equal(first.terminal, false);
  assert.equal(first.operation.status, 'RETRYABLE_FAILURE');
  const retryOutbox = await store.getOutboxMessage(committed.outbox.id);
  assert.equal(retryOutbox?.state, 'RETRY_SCHEDULED');
  assert.ok(retryOutbox?.availableAt);

  await new MetaOperationDispatcher({ store, payloadRegistry: registry, publisher: { publish: async () => ({ externalMessageId: 'job-2' }) } }).dispatchDue();
  const operation = await store.getOperation(committed.operation.id);
  if (operation?.status !== 'QUEUED') {
    const retryAt = new Date(retryOutbox?.availableAt ?? Date.now());
    const batch = await store.claimDueOutbox({ now: new Date(retryAt.getTime() + 1) });
    assert.equal(batch.messages.length, 1);
    await store.markOutboxPublished({ messageId: batch.messages[0].id, leaseToken: batch.leaseToken });
  }
  const second = await executeMetaOperation({ operationId: committed.operation.id, store, payloadRegistry: registry, handlerRegistry: handlers });
  assert.equal(second.operation.status, 'SUCCEEDED');
  assert.equal(calls, 2);
  assert.ok((await store.listOperationEvents(committed.operation.id)).some((event) => event.eventType === 'EXECUTION_DEFERRED'));
});

test('expired operation is dead-lettered before provider dispatch', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: operationRegistry() });
  const expiresAt = new Date(Date.now() + 1_100);
  const committed = await service.commit(command({ expiresAt, idempotencyKey: 'expires' }));
  let published = false;
  const batch = await store.claimDueOutbox({ now: new Date(expiresAt.getTime() + 1) });
  assert.equal(batch.messages.length, 0);
  assert.equal((await store.getOutboxMessage(committed.outbox.id))?.state, 'DEAD_LETTER');
  assert.equal((await store.getOperation(committed.operation.id))?.status, 'PERMANENT_FAILURE');
  assert.equal(published, false);
});
