import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateManagedCatalogHideTransitions,
  MAX_MASS_HIDE_COUNT,
  MAX_MASS_HIDE_RATIO,
} from '../../lib/meta-platform/domains/catalog/hide-governance.ts';

test('MCP-03: previously managed + inactive generates out of stock + staging update', () => {
  const previouslyManaged = [
    { retailerId: 'MB-SKU-1', sourceType: 'PRODUCT', sourceId: 'p-1', status: 'ACTIVE' },
  ];
  const desiredActiveItems = new Map(); // empty, product is now inactive or deleted

  const result = evaluateManagedCatalogHideTransitions({
    previouslyManaged,
    desiredActiveItems,
    managedTotalCount: 10,
  });

  assert.equal(result.shouldBrake, false);
  assert.equal(result.itemsToHide.length, 1);
  assert.equal(result.itemsToHide[0].retailerId, 'MB-SKU-1');
  assert.equal(result.itemsToHide[0].availability, 'out of stock');
  assert.equal(result.itemsToHide[0].visibility, 'staging');
});

test('MCP-03: never-managed + inactive submits nothing', () => {
  const previouslyManaged = []; // never synced before
  const desiredActiveItems = new Map();

  const result = evaluateManagedCatalogHideTransitions({
    previouslyManaged,
    desiredActiveItems,
    managedTotalCount: 0,
  });

  assert.equal(result.itemsToHide.length, 0);
  assert.equal(result.shouldBrake, false);
});

test('MCP-03: mass-change brake triggers when hiding > 20% or > 50 items', () => {
  // Scenario A: > 20% (e.g. 3 out of 10 items = 30%)
  const previouslyManagedA = Array.from({ length: 3 }, (_, i) => ({
    retailerId: `SKU-${i}`,
    sourceType: 'PRODUCT',
    sourceId: `p-${i}`,
    status: 'ACTIVE',
  }));

  const resultA = evaluateManagedCatalogHideTransitions({
    previouslyManaged: previouslyManagedA,
    desiredActiveItems: new Map(),
    managedTotalCount: 10, // 3/10 = 30% > 20%
  });
  assert.equal(resultA.shouldBrake, true);
  assert.equal(resultA.brakeReason, 'MASS_HIDE_RATIO_EXCEEDED');

  // Scenario B: > 50 items (e.g. 51 out of 500 items = 10.2% but > 50 count)
  const previouslyManagedB = Array.from({ length: 51 }, (_, i) => ({
    retailerId: `SKU-${i}`,
    sourceType: 'PRODUCT',
    sourceId: `p-${i}`,
    status: 'ACTIVE',
  }));

  const resultB = evaluateManagedCatalogHideTransitions({
    previouslyManaged: previouslyManagedB,
    desiredActiveItems: new Map(),
    managedTotalCount: 500,
  });
  assert.equal(resultB.shouldBrake, true);
  assert.equal(resultB.brakeReason, 'MASS_HIDE_COUNT_EXCEEDED');
});

test('MCP-03: hard delete plan requires minimum 30 days hidden age', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  const twentyDaysAgo = new Date('2026-09-13T12:00:00Z');
  const thirtyFiveDaysAgo = new Date('2026-08-29T12:00:00Z');

  // 20 days: not eligible for delete plan yet
  const notEligible = evaluateManagedCatalogHideTransitions({
    previouslyManaged: [
      { retailerId: 'OLD-1', status: 'ACTIVE', hiddenSince: twentyDaysAgo },
    ],
    desiredActiveItems: new Map(),
    managedTotalCount: 100,
    now,
  });
  assert.equal(notEligible.eligibleForDeletePlan.length, 0);

  // 35 days: eligible for delete plan
  const eligible = evaluateManagedCatalogHideTransitions({
    previouslyManaged: [
      { retailerId: 'OLD-2', status: 'ACTIVE', hiddenSince: thirtyFiveDaysAgo },
    ],
    desiredActiveItems: new Map(),
    managedTotalCount: 100,
    now,
  });
  assert.equal(eligible.eligibleForDeletePlan.length, 1);
  assert.equal(eligible.eligibleForDeletePlan[0].retailerId, 'OLD-2');
});
