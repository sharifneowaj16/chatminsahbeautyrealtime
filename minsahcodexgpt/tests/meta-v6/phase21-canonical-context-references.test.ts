import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMetaConnectionReferenceBackfill,
  createMetaAssetContext,
  InMemoryMetaExternalReferenceRepository,
  MetaAssetContextError,
  MetaExternalReferenceConflictError,
  normalizeMetaProviderPage,
  normalizeMetaProviderResource,
} from '../../lib/meta-platform/index';

const productionContext = createMetaAssetContext({
  environment: 'PRODUCTION',
  connectionKey: 'primary',
  assets: [
    { type: 'CATALOG', id: 'catalog-prod-1' },
    { type: 'PAGE', id: 'page-prod-1' },
  ],
});

const productMapping = {
  objectType: 'PRODUCT_ITEM' as const,
  idFields: ['id', 'retailer_id'],
  parentIdFields: ['product_group.id'],
  nameFields: ['name'],
  statusFields: ['availability'],
  updatedAtFields: ['updated_time'],
  attributes: {
    retailerId: ['retailer_id'],
    priceAmount: ['price.amount'],
    currency: ['price.currency'],
    active: ['is_published'],
  },
};

test('provider objects normalize to a stable allowlisted canonical snapshot', () => {
  const provider = {
    id: 'provider-product-1',
    retailer_id: 'SKU-001',
    name: 'Daily Cleanser',
    availability: 'in stock',
    updated_time: '2026-07-21T17:35:00.000Z',
    product_group: { id: 'group-1' },
    price: { amount: 1250, currency: 'BDT' },
    is_published: true,
    access_token: 'EA_SECRET_MUST_NOT_LEAK',
    unsupported_nested_payload: { raw: true },
  };

  const actual = normalizeMetaProviderResource(provider, productMapping, '2026-07-21T17:36:00.000Z');
  assert.deepEqual(actual, {
    provider: 'META',
    objectType: 'PRODUCT_ITEM',
    id: 'provider-product-1',
    parentId: 'group-1',
    name: 'Daily Cleanser',
    status: 'IN_STOCK',
    updatedAt: '2026-07-21T17:35:00.000Z',
    capturedAt: '2026-07-21T17:36:00.000Z',
    attributes: {
      retailerId: 'SKU-001',
      priceAmount: 1250,
      currency: 'BDT',
      active: true,
    },
  });
  assert.equal(JSON.stringify(actual).includes('EA_SECRET_MUST_NOT_LEAK'), false);
  assert.equal(Object.isFrozen(actual), true);
  assert.equal(Object.isFrozen(actual.attributes), true);
});

test('provider pagination exposes cursor state without leaking the provider next URL', () => {
  const page = normalizeMetaProviderPage({
    data: [{ id: '1', retailer_id: 'SKU-1' }, { id: '2', retailer_id: 'SKU-2' }],
    paging: {
      cursors: { after: 'cursor-2' },
      next: 'https://graph.facebook.com/v99.0/items?access_token=EA_SECRET',
    },
  }, productMapping, '2026-07-21T17:36:00.000Z');

  assert.equal(page.items.length, 2);
  assert.equal(page.nextCursor, 'cursor-2');
  assert.equal(page.hasNext, true);
  assert.equal(JSON.stringify(page).includes('graph.facebook.com'), false);
  assert.equal(JSON.stringify(page).includes('EA_SECRET'), false);
});

test('asset context blocks staging references from production execution', async () => {
  const repository = new InMemoryMetaExternalReferenceRepository();
  await assert.rejects(repository.register(productionContext, {
    environment: 'STAGING',
    connectionKey: 'primary',
    assetType: 'CATALOG',
    assetId: 'catalog-prod-1',
    objectType: 'PRODUCT_ITEM',
    localId: 'product-local-1',
    providerId: 'provider-product-1',
  }), (error: unknown) => {
    assert.equal(error instanceof MetaAssetContextError, true);
    assert.equal((error as MetaAssetContextError).code, 'META_ASSET_ENVIRONMENT_MISMATCH');
    return true;
  });
});

test('reference registration is idempotent for the same local/provider pair', async () => {
  const repository = new InMemoryMetaExternalReferenceRepository({
    now: () => new Date('2026-07-21T17:40:00.000Z'),
    createId: () => 'reference-1',
  });
  const input = {
    environment: 'PRODUCTION' as const,
    connectionKey: 'primary',
    assetType: 'CATALOG' as const,
    assetId: 'catalog-prod-1',
    objectType: 'PRODUCT_ITEM',
    localId: 'product-local-1',
    providerId: 'provider-product-1',
    canonicalKey: 'SKU-001',
  };

  const first = await repository.register(productionContext, input);
  const second = await repository.register(productionContext, { ...input, source: 'RECONCILIATION' });
  assert.equal(first.id, 'reference-1');
  assert.equal(second.id, 'reference-1');
  assert.equal(second.source, 'RECONCILIATION');
  assert.deepEqual(await repository.findByLocal(input), second);
  assert.deepEqual(await repository.findByProvider(input), second);
});

test('reference uniqueness rejects local remap and provider aliasing', async () => {
  const repository = new InMemoryMetaExternalReferenceRepository();
  const base = {
    environment: 'PRODUCTION' as const,
    connectionKey: 'primary',
    assetType: 'CATALOG' as const,
    assetId: 'catalog-prod-1',
    objectType: 'PRODUCT_ITEM',
    localId: 'product-local-1',
    providerId: 'provider-product-1',
  };
  await repository.register(productionContext, base);

  await assert.rejects(repository.register(productionContext, {
    ...base,
    providerId: 'provider-product-2',
  }), (error: unknown) => error instanceof MetaExternalReferenceConflictError
    && error.code === 'META_REFERENCE_LOCAL_CONFLICT');

  await assert.rejects(repository.register(productionContext, {
    ...base,
    localId: 'product-local-2',
  }), (error: unknown) => error instanceof MetaExternalReferenceConflictError
    && error.code === 'META_REFERENCE_PROVIDER_CONFLICT');
});

test('connection backfill requires explicit matching environment and asset bindings', () => {
  const context = createMetaAssetContext({
    environment: 'STAGING',
    connectionKey: 'staging-primary',
    assets: [
      { type: 'APP', id: 'app-staging-1' },
      { type: 'PAGE', id: 'page-staging-1' },
    ],
  });
  const candidates = buildMetaConnectionReferenceBackfill(context, {
    id: 'connection-1',
    name: 'staging-primary',
    appId: 'app-staging-1',
    pageId: 'page-staging-1',
    catalogId: null,
  });

  assert.deepEqual(candidates.map((item) => ({
    environment: item.environment,
    assetType: item.assetType,
    localId: item.localId,
    providerId: item.providerId,
    source: item.source,
  })), [
    {
      environment: 'STAGING',
      assetType: 'APP',
      localId: 'meta-connection:connection-1:APP',
      providerId: 'app-staging-1',
      source: 'BACKFILL',
    },
    {
      environment: 'STAGING',
      assetType: 'PAGE',
      localId: 'meta-connection:connection-1:PAGE',
      providerId: 'page-staging-1',
      source: 'BACKFILL',
    },
  ]);
});
