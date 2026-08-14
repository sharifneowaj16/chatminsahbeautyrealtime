import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetaInvocationContext } from '../../lib/meta-platform/core/context';
import {
  InMemoryMetaOperationStore,
  MetaOperationDispatcher,
  MetaOperationHandlerRegistry,
  MetaOperationService,
  MetaPayloadCodecRegistry,
  createMetaVersionedPayload,
  digestMetaVersionedPayload,
  executeMetaOperation,
  type MetaVersionedPayload,
} from '../../lib/meta-platform/operations/index';

function registry() {
  return new MetaPayloadCodecRegistry().register({
    type: 'catalog.sync',
    schemaVersion: 1,
    decode(data) {
      if (!data || typeof data !== 'object' || typeof (data as { catalogId?: unknown }).catalogId !== 'string') {
        throw new Error('catalogId required');
      }
      return data as { catalogId: string; mode?: string };
    },
  });
}

function command(payload: MetaVersionedPayload = createMetaVersionedPayload({ type: 'catalog.sync', schemaVersion: 1, data: { catalogId: 'catalog-1', mode: 'incremental' } })) {
  return {
    environment: 'STAGING' as const,
    connectionKey: 'primary',
    capability: 'catalog',
    operationType: 'catalog.sync',
    idempotencyKey: 'catalog-sync:catalog-1:2026-07-22T16:00',
    credentialRole: 'BUSINESS_SYSTEM_USER' as const,
    assetType: 'CATALOG' as const,
    assetId: 'catalog-1',
    invocation: createMetaInvocationContext({ correlationId: 'phase25-test', actor: { type: 'SYSTEM' } }),
    payload,
  };
}

test('versioned payloads are deterministic and reject secret-like fields', () => {
  const left = createMetaVersionedPayload({ type: 'catalog.sync', schemaVersion: 1, data: { mode: 'incremental', catalogId: '1' } });
  const right = createMetaVersionedPayload({ type: 'catalog.sync', schemaVersion: 1, data: { catalogId: '1', mode: 'incremental' } });
  assert.equal(digestMetaVersionedPayload(left), digestMetaVersionedPayload(right));
  assert.throws(
    () => createMetaVersionedPayload({ type: 'catalog.sync', schemaVersion: 1, data: { accessToken: 'secret' } }),
    /forbidden secret-like field/i,
  );
});

test('business mutation, operation and outbox commit atomically and rollback together', async () => {
  const store = new InMemoryMetaOperationStore({ orderState: 'PENDING' });
  const service = new MetaOperationService({ store, payloadRegistry: registry() });

  await assert.rejects(
    () => service.commit(command(), async (tx) => {
      (tx.raw as Record<string, unknown>).orderState = 'PAID';
      throw new Error('ROLLBACK');
    }),
    /ROLLBACK/,
  );
  assert.deepEqual(store.snapshotBusinessState(), { orderState: 'PENDING' });
  assert.equal((await store.claimDueOutbox()).messages.length, 0);

  const committed = await service.commit(command(), async (tx) => {
    (tx.raw as Record<string, unknown>).orderState = 'PAID';
    return { changed: true };
  });
  assert.equal(committed.created, true);
  assert.equal(committed.operation.status, 'ACCEPTED');
  assert.equal(committed.outbox.state, 'PENDING');
  assert.deepEqual(store.snapshotBusinessState(), { orderState: 'PAID' });
  assert.deepEqual(committed.businessResult, { changed: true });
});

test('idempotency suppresses duplicate business mutation and preserves audit event', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: registry() });
  let mutations = 0;
  const first = await service.commit(command(), async () => { mutations += 1; });
  const second = await service.commit(command(), async () => { mutations += 1; });
  assert.equal(mutations, 1);
  assert.equal(second.created, false);
  assert.equal(second.operation.id, first.operation.id);
  assert.equal(second.outbox.id, first.outbox.id);
  const events = await store.listOperationEvents(first.operation.id);
  assert.deepEqual(events.map((event) => event.sequence), [1, 2, 3]);
  assert.equal(events.at(-1)?.eventType, 'DUPLICATE_IGNORED');
});

test('idempotency rejects conflicting payload reuse without mutating the original operation', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: registry() });
  const first = await service.commit(command());
  const conflicting = createMetaVersionedPayload({
    type: 'catalog.sync',
    schemaVersion: 1,
    data: { catalogId: 'catalog-1', mode: 'full' },
  });
  await assert.rejects(
    () => service.commit(command(conflicting)),
    (error: unknown) => error instanceof Error
      && (error as Error & { code?: string }).code === 'META_OPERATION_IDEMPOTENCY_CONFLICT',
  );
  assert.equal((await store.listOperationEvents(first.operation.id)).length, 2);
});

test('Redis outage releases durable outbox without losing the operation', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: registry() });
  const committed = await service.commit(command());
  const dispatcher = new MetaOperationDispatcher({
    store,
    payloadRegistry: registry(),
    retryDelayMs: 1_000,
    publisher: { publish: async () => { throw new Error('REDIS_DOWN'); } },
  });
  const summary = await dispatcher.dispatchDue();
  assert.equal(summary.deferred, 1);
  const message = await store.getOutboxMessage(committed.outbox.id);
  assert.equal(message?.state, 'RETRY_SCHEDULED');
  assert.equal(message?.attempts, 1);
  assert.equal((await store.getOperation(committed.operation.id))?.status, 'ACCEPTED');
});

test('unsupported payload versions are quarantined instead of blindly dispatched', async () => {
  const store = new InMemoryMetaOperationStore();
  const unsupported = createMetaVersionedPayload({ type: 'catalog.sync', schemaVersion: 2, data: { catalogId: 'catalog-1' } });
  const committed = await store.commitWithOperation(command(unsupported));
  let published = false;
  const dispatcher = new MetaOperationDispatcher({
    store,
    payloadRegistry: registry(),
    publisher: { publish: async () => { published = true; } },
  });
  const summary = await dispatcher.dispatchDue();
  assert.equal(summary.quarantined, 1);
  assert.equal(published, false);
  assert.equal((await store.getOutboxMessage(committed.outbox.id))?.state, 'QUARANTINED');
  assert.equal((await store.getOperation(committed.operation.id))?.status, 'QUARANTINED');
});

test('publish acknowledgement loss produces stable at-least-once message identity', async () => {
  const store = new InMemoryMetaOperationStore();
  const committed = await new MetaOperationService({ store, payloadRegistry: registry() }).commit(command());
  const firstNow = new Date(Date.now() + 10);
  const firstClaim = await store.claimDueOutbox({ now: firstNow, leaseMs: 1_000 });
  assert.equal(firstClaim.messages.length, 1);
  const deliveredIds = [firstClaim.messages[0].operationId];
  const secondClaim = await store.claimDueOutbox({ now: new Date(firstNow.getTime() + 2_000), leaseMs: 1_000 });
  deliveredIds.push(secondClaim.messages[0].operationId);
  assert.deepEqual(deliveredIds, [committed.operation.id, committed.operation.id]);
});

test('worker crash lease expiry allows redispatch while execution remains idempotent', async () => {
  const store = new InMemoryMetaOperationStore();
  const service = new MetaOperationService({ store, payloadRegistry: registry() });
  const committed = await service.commit(command());
  const claimed = await store.claimDueOutbox();
  await store.markOutboxPublished({ messageId: committed.outbox.id, leaseToken: claimed.leaseToken });

  const firstExecution = await store.beginExecution({ operationId: committed.operation.id, now: new Date('2026-07-22T16:00:00Z'), leaseMs: 1_000 });
  assert.equal(firstExecution.claimed, true);
  const secondExecution = await store.beginExecution({ operationId: committed.operation.id, now: new Date('2026-07-22T16:00:02Z'), leaseMs: 1_000 });
  assert.equal(secondExecution.claimed, true);
  assert.equal(secondExecution.operation.attempts, 2);

  let providerCalls = 0;
  const handlers = new MetaOperationHandlerRegistry().register<{ catalogId: string }>('catalog.sync', {
    execute: async () => { providerCalls += 1; return { providerId: 'job-1' }; },
  });
  await store.completeExecution({ operationId: committed.operation.id, leaseToken: secondExecution.leaseToken!, result: { recovered: true } });
  const duplicate = await executeMetaOperation({ operationId: committed.operation.id, store, payloadRegistry: registry(), handlerRegistry: handlers });
  assert.equal(duplicate.duplicate, true);
  assert.equal(providerCalls, 0);
});

test('normal execution decodes payload, records result and ignores duplicate delivery', async () => {
  const store = new InMemoryMetaOperationStore();
  const committed = await new MetaOperationService({ store, payloadRegistry: registry() }).commit(command());
  const claimed = await store.claimDueOutbox();
  await store.markOutboxPublished({ messageId: committed.outbox.id, leaseToken: claimed.leaseToken });
  let calls = 0;
  const handlers = new MetaOperationHandlerRegistry().register<{ catalogId: string }>('catalog.sync', {
    execute: async ({ payload }) => { calls += 1; return { catalogId: payload.catalogId, accepted: true }; },
  });
  const first = await executeMetaOperation({ operationId: committed.operation.id, store, payloadRegistry: registry(), handlerRegistry: handlers });
  const second = await executeMetaOperation({ operationId: committed.operation.id, store, payloadRegistry: registry(), handlerRegistry: handlers });
  assert.equal(first.operation.status, 'SUCCEEDED');
  assert.equal(second.duplicate, true);
  assert.equal(calls, 1);
});
