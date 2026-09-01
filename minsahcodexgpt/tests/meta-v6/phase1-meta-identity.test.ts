import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMetaCatalogData,
  resolveMetaCatalogIdentity,
} from '../../lib/tracking/meta-content-id';
import {
  MetaCatalogIdentityEnvError,
  resolveMetaCatalogIdSourceEnv,
} from '../../lib/tracking/meta-content-id-env';

test('server and browser catalog identity sources must match', () => {
  assert.equal(
    resolveMetaCatalogIdSourceEnv({
      META_CATALOG_ID_SOURCE: 'sku',
      NEXT_PUBLIC_META_CATALOG_ID_SOURCE: 'sku',
    }, { required: true }),
    'sku'
  );

  assert.equal(
    resolveMetaCatalogIdSourceEnv({
      META_CATALOG_ID_SOURCE: 'database_id',
      NEXT_PUBLIC_META_CATALOG_ID_SOURCE: 'database_id',
    }, { required: true }),
    'database_id'
  );

  assert.throws(
    () => resolveMetaCatalogIdSourceEnv({
      META_CATALOG_ID_SOURCE: 'sku',
      NEXT_PUBLIC_META_CATALOG_ID_SOURCE: 'database_id',
    }, { required: true }),
    MetaCatalogIdentityEnvError
  );

  assert.throws(
    () => resolveMetaCatalogIdSourceEnv({}, { required: true }),
    /both required/
  );
});

test('simple and variant items resolve the same canonical namespace used by event payloads', () => {
  const simple = {
    productId: 'db-product-1',
    productSku: 'SKU-001',
    quantity: 1,
    price: 1250,
  };
  assert.deepEqual(resolveMetaCatalogIdentity(simple, 'sku'), {
    itemId: 'SKU-001',
    itemSource: 'product_sku',
    isVariant: false,
  });
  assert.deepEqual(buildMetaCatalogData([simple], 'sku')?.content_ids, ['SKU-001']);
  assert.deepEqual(buildMetaCatalogData([simple], 'database_id')?.content_ids, ['db-product-1']);

  const variant = {
    productId: 'db-product-1',
    productSku: 'SKU-001',
    variantId: 'db-variant-red',
    variantSku: 'SKU-001-RED',
    quantity: 2,
    price: 1300,
  };
  assert.deepEqual(resolveMetaCatalogIdentity(variant, 'sku'), {
    itemId: 'SKU-001-RED',
    groupId: 'SKU-001',
    itemSource: 'variant_sku',
    groupSource: 'product_sku',
    isVariant: true,
  });
  const eventData = buildMetaCatalogData([variant], 'sku');
  assert.deepEqual(eventData?.content_ids, ['SKU-001-RED']);
  assert.equal(eventData?.contents[0]?.item_group_id, 'SKU-001');
});

test('SKU rename changes the canonical ID and catalog reconciliation retains DELETE support', () => {
  const before = resolveMetaCatalogIdentity({
    productId: 'db-product-1',
    productSku: 'SKU-OLD',
  }, 'sku');
  const after = resolveMetaCatalogIdentity({
    productId: 'db-product-1',
    productSku: 'SKU-NEW',
  }, 'sku');

  assert.equal(before?.itemId, 'SKU-OLD');
  assert.equal(after?.itemId, 'SKU-NEW');
  assert.notEqual(before?.itemId, after?.itemId);

  const catalogSource = fs.readFileSync('lib/meta-platform/domains/catalog/orchestration.ts', 'utf8');
  const deleteAdapterSource = fs.readFileSync('lib/meta/catalog/adapters/items-batch.ts', 'utf8');
  assert.match(deleteAdapterSource, /method:\s*'DELETE'/);
  assert.match(catalogSource, /serializeItemsBatchDelete/);
  assert.match(catalogSource, /MetaCatalogSyncItem|metaCatalogSyncItem/);
});

test('known raw database product ID Meta field regressions are absent', () => {
  const files = [
    'lib/tracking/events.ts',
    'app/api/search/clicks/route.ts',
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /content_ids\s*:\s*\[\s*productId\s*\]/);
    assert.doesNotMatch(source, /content_ids\s*:\s*\[\s*click\.productId\s*\]/);
    assert.doesNotMatch(source, /contents\s*:\s*\[\s*\{\s*id:\s*productId/);
  }
});
