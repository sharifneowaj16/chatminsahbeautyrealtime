export const SHOP_LISTING_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=120';

// Phase 10: keep Elasticsearch listing payload card-safe. Heavy SEO/admin/body fields
// stay indexed for ranking/highlighting, but are not returned to the shop grid.
export const SHOP_SEARCH_SOURCE_FIELDS = [
  'id',
  'name',
  'slug',
  'price',
  'compareAtPrice',
  'discount',
  'images',
  'brand',
  'brandSlug',
  'category',
  'categorySlug',
  'categoryName',
  'subcategory',
  'subcategorySlug',
  'subcategoryName',
  'inStock',
  'stock',
  'quantity',
  'totalStock',
  'availableQuantity',
  'rating',
  'reviewCount',
  'codAvailable',
  'isCODAvailable',
  'returnEligible',
  'freeShippingEligible',
  'authenticityBadge',
  'deliveryBadge',
  'badges',
  'viewCount',
  'salesCount',
  'orderCount',
  'confirmedOrderCount',
  'deliveredOrderCount',
  'isFeatured',
  'isFlashSale',
  'isNewArrival',
  'createdAt',
] as const;

export function getPayloadByteSize(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

export function getShopPayloadHeaders(payload: unknown, extraHeaders: Record<string, string> = {}) {
  return {
    ...extraHeaders,
    'X-Approx-Payload-Bytes': String(getPayloadByteSize(payload)),
    'X-Shop-Payload-Policy': 'listing-lightweight',
  };
}

/**
 * Phase 7: Unified Elasticsearch Browse Feature Flag.
 *
 * When true, ALL /shop requests (with or without a query) are routed through
 * /api/search (Elasticsearch with DB fallback). When false, the legacy
 * /api/products path is used for no-query browse, preserving zero-downtime
 * rollback capability.
 *
 * Control via environment variable:
 *   NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE=true   → unified ES path
 *   NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE=false  → legacy products path (instant rollback)
 *
 * Defaults to true so production gets facets, consistent sorting, and
 * skinType/skinConcern/saleOnly filters during no-query browse.
 */
export function isUnifiedBrowseEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE;
  // Explicitly opt out by setting the flag to 'false'. Any other value (or absence) enables it.
  return flag !== 'false';
}

