import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  createMetaInvocationContext,
  createMetaPlatformError,
  listMetaCapabilityDefinitions,
  MetaPlatform,
  metaFailure,
  metaSuccess,
} from '../../lib/meta-platform/index';
import { createLegacyMetaCapabilityAdapter, createServerMetaPlatform } from '../../lib/meta-platform/server';
import { buildMetaPurchaseEventId } from '../../lib/meta/capi/event-id';

const context = createMetaInvocationContext({
  correlationId: 'phase20-correlation-1',
  actor: { type: 'SYSTEM', reference: 'phase20-test' },
  requestedAt: '2026-07-21T17:20:00.000Z',
  deadlineAt: '2026-07-21T17:21:00.000Z',
});

test('capability registry matches the frozen Phase 19 manifest', () => {
  const manifest = JSON.parse(fs.readFileSync('config/meta-capability-manifest.json', 'utf8'));
  const expected = manifest.capabilities
    .map((capability: { id: string; targetPhase: number; cutoverFlag: string }) => ({
      id: capability.id,
      targetPhase: capability.targetPhase,
      cutoverFlag: capability.cutoverFlag,
    }))
    .sort((left: { id: string }, right: { id: string }) => left.id.localeCompare(right.id));
  const actual = [...listMetaCapabilityDefinitions()]
    .map((capability) => ({ ...capability }))
    .sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(actual, expected);
});

test('unregistered capability fails with a stable safe configuration error', async () => {
  const platform = new MetaPlatform();
  const result = await platform.invoke({
    capability: 'connection-health',
    operation: 'connection.readiness',
    mode: 'READ',
    payload: {},
    context,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, 'META_CAPABILITY_UNAVAILABLE');
  assert.equal(result.error.category, 'CONFIGURATION');
  assert.equal(result.error.retryable, false);
  assert.equal(result.error.correlationId, context.correlationId);
});

test('legacy compatibility adapter preserves existing function behavior', async () => {
  const adapter = createLegacyMetaCapabilityAdapter({
    capability: 'capi-delivery',
    operations: {
      'purchase.event-id': (payload) => {
        const orderId = (payload as { orderId: string }).orderId;
        return buildMetaPurchaseEventId(orderId);
      },
    },
  });
  const platform = createServerMetaPlatform({ adapters: [adapter] });
  const result = await platform.invoke<{ orderId: string }, string>({
    capability: 'capi-delivery',
    operation: 'purchase.event-id',
    mode: 'READ',
    payload: { orderId: ' Order 123 ' },
    context,
  });
  assert.deepEqual(result, metaSuccess('Purchase-Order-123', context.correlationId));
});

test('legacy adapter preserves an existing normalized result contract', async () => {
  const expected = metaFailure(createMetaPlatformError({
    code: 'META_LEGACY_VALIDATION_FAILED',
    category: 'VALIDATION',
    message: 'Legacy validation rejected the input.',
    retryable: false,
    correlationId: context.correlationId,
  }));
  const platform = createServerMetaPlatform({
    adapters: [createLegacyMetaCapabilityAdapter({
      capability: 'shared-meta-support',
      operations: { 'legacy.validate': () => expected },
    })],
  });
  const result = await platform.invoke({
    capability: 'shared-meta-support',
    operation: 'legacy.validate',
    mode: 'READ',
    payload: null,
    context,
  });
  assert.equal(result, expected);
});

test('legacy exceptions are normalized without exposing raw provider details', async () => {
  const secret = 'EA_SECRET_TOKEN_MUST_NOT_LEAK';
  const platform = createServerMetaPlatform({
    adapters: [createLegacyMetaCapabilityAdapter({
      capability: 'shared-meta-support',
      operations: {
        'legacy.throw': () => { throw new Error(`provider failed with ${secret}`); },
      },
    })],
  });
  const result = await platform.invoke({
    capability: 'shared-meta-support',
    operation: 'legacy.throw',
    mode: 'WRITE',
    payload: {},
    context,
  });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes(secret), false);
  if (!result.ok) assert.equal(result.error.code, 'META_LEGACY_OPERATION_FAILED');
});

test('duplicate capability adapters fail before any operation executes', () => {
  const first = createLegacyMetaCapabilityAdapter({
    capability: 'shared-meta-support',
    operations: { 'legacy.first': () => 'first' },
  });
  const second = createLegacyMetaCapabilityAdapter({
    capability: 'shared-meta-support',
    operations: { 'legacy.second': () => 'second' },
  });
  assert.throws(() => new MetaPlatform({ adapters: [first, second] }), /META_CAPABILITY_ADAPTER_DUPLICATE/);
});

test('invalid operation names are rejected before adapter execution', async () => {
  let called = false;
  const platform = new MetaPlatform({
    adapters: [{
      capability: 'shared-meta-support',
      async invoke() {
        called = true;
        return metaSuccess('unexpected');
      },
    }],
  });
  const result = await platform.invoke({
    capability: 'shared-meta-support',
    operation: 'Invalid operation with spaces',
    mode: 'READ',
    payload: {},
    context,
  });
  assert.equal(called, false);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'META_OPERATION_INVALID');
});



test('malformed JavaScript requests return validation results instead of throwing', async () => {
  const platform = new MetaPlatform();
  const invokeUnknown = platform.invoke.bind(platform) as (request: unknown) => Promise<unknown>;
  const result = await invokeUnknown(null) as { ok: boolean; error?: { code: string } };
  assert.equal(result.ok, false);
  assert.equal(result.error?.code, 'META_REQUEST_INVALID');
});

test('server entry import performs no network call', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('NETWORK_CALL_ON_IMPORT');
  };
  try {
    await import('../../lib/meta-platform/server');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
