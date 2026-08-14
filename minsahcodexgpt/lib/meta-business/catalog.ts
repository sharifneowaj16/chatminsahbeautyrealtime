import 'server-only';

import {
  createCatalogThroughMetaPlatform as createCatalog,
  createProductFeedThroughMetaPlatform,
  listCatalogProductsThroughMetaPlatform as listCatalogProducts,
  listCatalogsThroughMetaPlatform as listCatalogs,
  scheduleProductFeedThroughMetaPlatform,
  updateCatalogThroughMetaPlatform as updateCatalog,
  uploadProductFeedThroughMetaPlatform,
} from '@/lib/meta-platform/migration/phase30-catalog-facade';
import {
  buildCatalogCsv,
  buildCatalogRequests,
  listCanonicalCatalogItemsForProductSets,
  pollPendingCatalogBatches,
  resolveCatalogFeedUrl,
  retryFailedCatalogBatchItems,
  syncCatalogProducts,
} from '@/lib/meta-platform/domains/catalog/orchestration';

export { createCatalog, listCatalogProducts, listCatalogs, updateCatalog };
export { buildCatalogCsv, buildCatalogRequests, listCanonicalCatalogItemsForProductSets, pollPendingCatalogBatches, retryFailedCatalogBatchItems, syncCatalogProducts };

export async function createProductFeed(input: { catalogId?: string; name: string; country?: string; locale?: string; defaultCurrency?: string }) {
  return createProductFeedThroughMetaPlatform(input);
}
export async function uploadProductFeed(input: { feedId: string; url?: string }) {
  const url = await resolveCatalogFeedUrl({ url: input.url });
  return uploadProductFeedThroughMetaPlatform({ feedId: input.feedId, url });
}
export async function scheduleProductFeed(input: { feedId: string; url?: string; interval?: string; hour?: number; minute?: number; dayOfWeek?: string }) {
  const url = await resolveCatalogFeedUrl({ url: input.url });
  return scheduleProductFeedThroughMetaPlatform({ ...input, url });
}
