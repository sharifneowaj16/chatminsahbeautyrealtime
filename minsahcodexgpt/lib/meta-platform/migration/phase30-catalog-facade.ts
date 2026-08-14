import 'server-only';

import { META_PRODUCT_ITEM_READ_FIELDS } from '@/lib/meta/catalog/adapters/product-item-read';
import { compileMetaProductSetFilter } from '@/lib/meta/product-sets/rules';
import { InMemoryMetaReadCacheStore } from '../reliability/cache';
import { MetaPlatformCatalogService } from '../domains/catalog/service';
import { assertMetaPhase30WriteAllowed, resolveMetaPhase30ReadCutover, resolveMetaPhase30WriteCutover } from './phase30-cutover';
import { executeMetaPhase30Read } from './phase30-read';

const readCache = new InMemoryMetaReadCacheStore();
function service() { return new MetaPlatformCatalogService(); }
function withCursorMigration<T extends { readonly data: readonly unknown[] }, M>(value: T, migration: M): Readonly<T & { readonly migration: M }> { return Object.freeze({ ...value, migration }); }
function withRecordMigration<T extends Record<string, unknown>, M>(value: T, migration: M): Readonly<T & { readonly migration: M }> { return Object.freeze({ ...value, migration }); }

export function getMetaPhase30CatalogCutoverStatus(env: NodeJS.ProcessEnv = process.env) {
  return Object.freeze({ reads: resolveMetaPhase30ReadCutover(env), writes: resolveMetaPhase30WriteCutover({ catalogId: env.META_CATALOG_ID, env }) });
}

export async function listCatalogsThroughMetaPlatform() {
  const legacy = service(); const platform = service();
  const result = await executeMetaPhase30Read({ cache: readCache, cacheKey: 'phase30:catalogs', legacy: () => legacy.listCatalogs(), platform: () => platform.listCatalogs() });
  return withCursorMigration(result.value, result.migration);
}
export async function listCatalogProductsThroughMetaPlatform(catalogId?: string, params: Record<string, unknown> = {}) {
  const legacy = service(); const platform = service();
  const result = await executeMetaPhase30Read({ cache: readCache, cacheKey: `phase30:products:${catalogId ?? 'default'}:${JSON.stringify(params)}`, legacy: () => legacy.listProducts(catalogId, META_PRODUCT_ITEM_READ_FIELDS, params), platform: () => platform.listProducts(catalogId, META_PRODUCT_ITEM_READ_FIELDS, params) });
  return withCursorMigration(result.value, result.migration);
}
export async function createCatalogThroughMetaPlatform(input: { name: string; vertical?: string }) {
  const catalogId = process.env.META_CATALOG_ID?.trim() || null;
  assertMetaPhase30WriteAllowed({ catalogId });
  return service().createCatalog(input);
}
export async function updateCatalogThroughMetaPlatform(catalogId: string, input: Record<string, unknown>) {
  assertMetaPhase30WriteAllowed({ catalogId });
  return service().updateCatalog(catalogId, input);
}
export async function createProductFeedThroughMetaPlatform(input: { catalogId?: string; name: string; country?: string; locale?: string; defaultCurrency?: string }) {
  const catalogId = input.catalogId ?? process.env.META_CATALOG_ID;
  assertMetaPhase30WriteAllowed({ catalogId });
  return service().createProductFeed(input);
}
export async function uploadProductFeedThroughMetaPlatform(input: { feedId: string; url: string }) {
  assertMetaPhase30WriteAllowed({ catalogId: process.env.META_CATALOG_ID });
  return service().uploadProductFeed(input);
}
export async function scheduleProductFeedThroughMetaPlatform(input: { feedId: string; url: string; interval?: string; hour?: number; minute?: number; dayOfWeek?: string }) {
  assertMetaPhase30WriteAllowed({ catalogId: process.env.META_CATALOG_ID });
  return service().scheduleProductFeed(input);
}
export async function listProviderProductSetsThroughMetaPlatform(catalogId?: string) {
  const legacy = service(); const platform = service();
  const result = await executeMetaPhase30Read({ cache: readCache, cacheKey: `phase30:product-sets:${catalogId ?? 'default'}`, legacy: () => legacy.listProductSets(catalogId), platform: () => platform.listProductSets(catalogId) });
  return withCursorMigration(result.value, result.migration);
}
export async function upsertProviderProductSetThroughMetaPlatform(input: { catalogId: string; providerProductSetId?: string | null; name: string; retailerIds: string[] }) {
  assertMetaPhase30WriteAllowed({ catalogId: input.catalogId });
  return service().upsertProductSet({ ...input, filter: compileMetaProductSetFilter(input.retailerIds) });
}
export async function fetchCatalogDiagnosticsThroughMetaPlatform(input: { catalogId?: string; limit?: number; correlationId?: string } = {}) {
  const catalogId = input.catalogId ?? process.env.META_CATALOG_ID;
  const legacy = service(); const platform = service();
  const result = await executeMetaPhase30Read({ cache: readCache, cacheKey: `phase30:diagnostics:${catalogId ?? 'default'}:${input.limit ?? 100}`, legacy: () => legacy.fetchDiagnostics(input), platform: () => platform.fetchDiagnostics(input) });
  return Object.freeze({ ...result.value, migration: result.migration });
}
