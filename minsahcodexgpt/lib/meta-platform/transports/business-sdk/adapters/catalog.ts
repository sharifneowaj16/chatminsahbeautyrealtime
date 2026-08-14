import { callMetaSdkMethod, createMetaSdkEntity } from '../entity';
import { normalizeMetaBusinessSdkCursor, normalizeMetaBusinessSdkValue, type MetaBusinessSdkCursor } from '../normalization';
import type { MetaBusinessSdkClient } from '../types';
import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkCatalogAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'catalog' as const,
  requiredExports: Object.freeze(['Business', 'ProductCatalog', 'ProductFeed', 'ProductSet']),
}));

function business(client: MetaBusinessSdkClient, businessId: string) {
  return createMetaSdkEntity(client, 'Business', businessId);
}
function catalog(client: MetaBusinessSdkClient, catalogId: string) {
  return createMetaSdkEntity(client, 'ProductCatalog', catalogId);
}
function feed(client: MetaBusinessSdkClient, feedId: string) {
  return createMetaSdkEntity(client, 'ProductFeed', feedId);
}
function productSet(client: MetaBusinessSdkClient, productSetId: string) {
  return createMetaSdkEntity(client, 'ProductSet', productSetId);
}

export async function listMetaOwnedCatalogs(
  client: MetaBusinessSdkClient,
  input: { readonly businessId: string; readonly fields: readonly string[]; readonly params?: Record<string, unknown> },
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  const value = await callMetaSdkMethod(business(client, input.businessId), 'getOwnedProductCatalogs', [...input.fields], input.params ?? {});
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(value);
}

export async function createMetaOwnedCatalog(
  client: MetaBusinessSdkClient,
  input: { readonly businessId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(business(client, input.businessId), 'createOwnedProductCatalog', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function updateMetaCatalog(
  client: MetaBusinessSdkClient,
  input: { readonly catalogId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(catalog(client, input.catalogId), 'update', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function listMetaCatalogProducts(
  client: MetaBusinessSdkClient,
  input: { readonly catalogId: string; readonly fields: readonly string[]; readonly params?: Record<string, unknown> },
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  const value = await callMetaSdkMethod(catalog(client, input.catalogId), 'getProducts', [...input.fields], input.params ?? {});
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(value);
}

export async function submitMetaCatalogItemsBatch(
  client: MetaBusinessSdkClient,
  input: { readonly catalogId: string; readonly requests: readonly Record<string, unknown>[] },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(catalog(client, input.catalogId), 'createItemsBatch', [], {
    item_type: 'PRODUCT_ITEM',
    requests: input.requests,
  });
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function createMetaProductFeed(
  client: MetaBusinessSdkClient,
  input: { readonly catalogId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(catalog(client, input.catalogId), 'createProductFeed', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function uploadMetaProductFeed(
  client: MetaBusinessSdkClient,
  input: { readonly feedId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(feed(client, input.feedId), 'createUpload', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function scheduleMetaProductFeed(
  client: MetaBusinessSdkClient,
  input: { readonly feedId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(feed(client, input.feedId), 'createUploadSchedule', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function listMetaCatalogProductSets(
  client: MetaBusinessSdkClient,
  input: { readonly catalogId: string; readonly fields: readonly string[]; readonly params?: Record<string, unknown> },
): Promise<MetaBusinessSdkCursor<Record<string, unknown>>> {
  const value = await callMetaSdkMethod(catalog(client, input.catalogId), 'getProductSets', [...input.fields], input.params ?? {});
  return normalizeMetaBusinessSdkCursor<Record<string, unknown>>(value);
}

export async function createMetaCatalogProductSet(
  client: MetaBusinessSdkClient,
  input: { readonly catalogId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(catalog(client, input.catalogId), 'createProductSet', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}

export async function updateMetaCatalogProductSet(
  client: MetaBusinessSdkClient,
  input: { readonly productSetId: string; readonly fields: readonly string[]; readonly params: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const value = await callMetaSdkMethod(productSet(client, input.productSetId), 'update', [...input.fields], input.params);
  return normalizeMetaBusinessSdkValue(value) as Record<string, unknown>;
}
