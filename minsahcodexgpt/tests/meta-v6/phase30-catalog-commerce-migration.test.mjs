import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCatalogDeletePlanIntegrity,
  buildCatalogDeletePlanPayload,
  normalizeCatalogBatchItemOutcomes,
  normalizeCatalogBatchStatus,
  stableCatalogHash,
} from '../../lib/meta-platform/domains/catalog/normalization.ts';
import {
  assertMetaPhase30MassDeleteOverride,
  assertMetaPhase30WriteAllowed,
  resolveMetaPhase30ReadCutover,
  resolveMetaPhase30WriteCutover,
} from '../../lib/meta-platform/migration/phase30-cutover.ts';
import { META_JOB_NAMES, META_QUEUE_NAMES, META_JOB_SCHEMA_VERSION, validateMetaJobPayload } from '../../lib/jobs/job-types.ts';

test('catalog hashes are canonical and full payload sensitive', () => {
  assert.equal(stableCatalogHash({ b: 2, a: 1 }), stableCatalogHash({ a: 1, b: 2 }));
  const ids = Array.from({ length: 101 }, (_, index) => `sku-${String(index).padStart(3, '0')}`);
  const first = buildCatalogDeletePlanPayload({ catalogId: 'cat-1', retailerIds: ids, sourceSnapshotHash: 'a'.repeat(64), managedItemCount: 200 });
  const changed = buildCatalogDeletePlanPayload({ catalogId: 'cat-1', retailerIds: [...ids.slice(0, 100), 'sku-tail-changed'], sourceSnapshotHash: 'a'.repeat(64), managedItemCount: 200 });
  assert.notEqual(first.digest, changed.digest);
});

test('delete plans are sorted, deduplicated and integrity checked', () => {
  const plan = buildCatalogDeletePlanPayload({ catalogId: 'cat-1', retailerIds: ['b', 'a', 'b'], sourceSnapshotHash: 'b'.repeat(64), managedItemCount: 10 });
  assert.deepEqual([...plan.retailerIds], ['a', 'b']);
  assert.equal(plan.itemCount, 2);
  assert.doesNotThrow(() => assertCatalogDeletePlanIntegrity(plan));
  assert.throws(() => assertCatalogDeletePlanIntegrity({ ...plan, itemCount: 3 }), /INTEGRITY/);
});

test('mass deletion threshold requires a separate emergency override', () => {
  const plan = buildCatalogDeletePlanPayload({ catalogId: 'cat-1', retailerIds: ['a', 'b', 'c'], sourceSnapshotHash: 'c'.repeat(64), managedItemCount: 4, maxDeleteCount: 100, maxDeleteRatio: 0.25 });
  assert.equal(plan.requiresEmergencyOverride, true);
  assert.throws(() => assertMetaPhase30MassDeleteOverride({ required: true, env: {} }), /OVERRIDE_REQUIRED/);
  assert.doesNotThrow(() => assertMetaPhase30MassDeleteOverride({ required: true, env: { META_PLATFORM_CATALOG_MASS_DELETE_OVERRIDE: 'true' } }));
});

test('batch status and item failures normalize deterministically', () => {
  assert.equal(normalizeCatalogBatchStatus('finished'), 'SUCCESS');
  assert.equal(normalizeCatalogBatchStatus('fatal'), 'FAILED');
  assert.equal(normalizeCatalogBatchStatus('processing'), 'SUBMITTED');
  const outcomes = normalizeCatalogBatchItemOutcomes({ data: [{ item_results: [
    { retailer_id: 'sku-ok', status: 'success' },
    { retailer_id: 'sku-retry', status: 'failed', error: { code: 613, message: 'rate limit' } },
    { retailer_id: 'sku-invalid', status: 'failed', error: { code: 100, message: 'invalid field' } },
  ] }] });
  assert.equal(outcomes.length, 3);
  assert.equal(outcomes[0].status, 'SUCCESS');
  assert.equal(outcomes[1].retryable, true);
  assert.equal(outcomes[2].retryable, false);
});

test('read cutover progresses legacy to shadow to platform', () => {
  assert.equal(resolveMetaPhase30ReadCutover({}).mode, 'LEGACY');
  assert.equal(resolveMetaPhase30ReadCutover({ META_PLATFORM_CATALOG_SHADOW: 'true' }).mode, 'SHADOW');
  assert.equal(resolveMetaPhase30ReadCutover({ META_PLATFORM_CATALOG_READS: 'true' }).mode, 'PLATFORM');
  assert.equal(resolveMetaPhase30ReadCutover({ META_PLATFORM_CATALOG_LEGACY_DISABLED: 'true' }).mode, 'PLATFORM');
});

test('writes support test catalog and fail closed on kill switch', () => {
  assert.equal(resolveMetaPhase30WriteCutover({ catalogId: 'cat-live', env: {} }).mode, 'LEGACY');
  assert.equal(resolveMetaPhase30WriteCutover({ catalogId: 'cat-test', env: { META_PLATFORM_CATALOG_TEST_CATALOG_ID: 'cat-test' } }).mode, 'PLATFORM_TEST');
  assert.equal(resolveMetaPhase30WriteCutover({ catalogId: 'cat-live', env: { META_PLATFORM_CATALOG_WRITES: 'true' } }).mode, 'PLATFORM');
  assert.equal(resolveMetaPhase30WriteCutover({ catalogId: 'cat-live', env: { META_PLATFORM_CATALOG_WRITES: 'true', META_PLATFORM_CATALOG_KILL_SWITCH: 'true' } }).mode, 'BLOCKED');
  assert.throws(() => assertMetaPhase30WriteAllowed({ catalogId: 'cat-live', env: { META_PLATFORM_CATALOG_KILL_SWITCH: 'true' } }), /KILL_SWITCHED/);
});

test('catalog delete jobs require a plan and prohibit plan IDs on normal sync', () => {
  const base = { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey: 'catalog-delete:plan-1', requestedAt: new Date().toISOString(), type: 'catalog_sync' };
  const missing = validateMetaJobPayload({ queueName: META_QUEUE_NAMES.CATALOG_SYNC, jobName: META_JOB_NAMES.CATALOG_SYNC, payload: { ...base, mode: 'delete' } });
  assert.equal(missing.valid, false);
  assert.ok(missing.issues.some((issue) => issue.code === 'CATALOG_DELETE_PLAN_ID_REQUIRED'));
  const valid = validateMetaJobPayload({ queueName: META_QUEUE_NAMES.CATALOG_SYNC, jobName: META_JOB_NAMES.CATALOG_SYNC, payload: { ...base, mode: 'delete', deletePlanId: 'plan-1' } });
  assert.equal(valid.valid, true);
  const forbidden = validateMetaJobPayload({ queueName: META_QUEUE_NAMES.CATALOG_SYNC, jobName: META_JOB_NAMES.CATALOG_SYNC, payload: { ...base, mode: 'incremental', deletePlanId: 'plan-1' } });
  assert.equal(forbidden.valid, false);
  assert.ok(forbidden.issues.some((issue) => issue.code === 'CATALOG_DELETE_PLAN_ID_FORBIDDEN'));
});
