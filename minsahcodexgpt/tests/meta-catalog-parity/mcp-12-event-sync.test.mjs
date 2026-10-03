import test from 'node:test';
import assert from 'node:assert/strict';
import {
  triggerEventDrivenCatalogSync,
  getDebounceStateForTesting,
  DEBOUNCE_WINDOW_MS,
  CATALOG_FEED_CACHE_KEY,
} from '../../lib/meta-platform/domains/catalog/event-sync.ts';

test('MCP-12: event-driven catalog sync debounces mutations over a 60-second window', async () => {
  const state = getDebounceStateForTesting();
  state.reset();

  assert.equal(DEBOUNCE_WINDOW_MS, 60_000);
  assert.equal(CATALOG_FEED_CACHE_KEY, 'meta:catalog:feed:csv');

  // Mutation 1
  const res1 = await triggerEventDrivenCatalogSync({
    productIds: ['prod-alpha', 'prod-beta'],
    reason: 'admin_price_edit',
  });
  assert.equal(res1.enqueued, true);

  const state1 = getDebounceStateForTesting();
  assert.equal(state1.pendingCount, 2);
  assert.equal(state1.hasActiveTimer, true);
  assert.deepEqual(state1.pendingIds.sort(), ['prod-alpha', 'prod-beta']);

  // Mutation 2 (adds another product and a duplicate)
  const res2 = await triggerEventDrivenCatalogSync({
    productIds: ['prod-beta', 'prod-gamma'],
    reason: 'inventory_adjust',
  });
  assert.equal(res2.enqueued, true);

  const state2 = getDebounceStateForTesting();
  assert.equal(state2.pendingCount, 3);
  assert.deepEqual(state2.pendingIds.sort(), ['prod-alpha', 'prod-beta', 'prod-gamma']);

  // Immediate flush override (e.g. CLI or test)
  const resFlush = await triggerEventDrivenCatalogSync({
    productIds: ['prod-delta'],
    reason: 'emergency_sync',
    immediate: true,
  });
  assert.equal(resFlush.enqueued, true);
  assert.equal(resFlush.count, 4); // alpha, beta, gamma, delta

  const stateAfter = getDebounceStateForTesting();
  assert.equal(stateAfter.pendingCount, 0);
  assert.equal(stateAfter.hasActiveTimer, false);

  state.reset();
});
