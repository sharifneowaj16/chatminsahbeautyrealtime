/**
 * Canonical Sort Mapper for Minsah Beauty.
 * 
 * Replaces duplicate sort mappers across:
 * - app/api/search/route.ts
 * - lib/search/db-fallback.ts
 * - app/components/shop/ShopGrid.tsx
 * - lib/catalog-navigation.ts
 */

import type { SearchApiSort, ShopPublicSort } from './types';

/**
 * Maps public shop sort keys (from UI/URL) to Elasticsearch / API sort keys.
 */
export const SORT_MAP: Record<string, SearchApiSort> = {
  featured: 'relevance',
  'best-selling': 'popularity',
  newest: 'newest',
  'price-low-high': 'price_asc',
  'price-high-low': 'price_desc',
  'highest-rated': 'rating',
  'biggest-discount': 'discount_desc',
  'a-z': 'name_asc',
  'z-a': 'name_desc',
  relevance: 'relevance',
  popularity: 'popularity',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
  rating: 'rating',
  discount_desc: 'discount_desc',
  name_asc: 'name_asc',
  name_desc: 'name_desc',
};

/**
 * Maps internal search API sort keys back to public shop sort keys.
 */
export const SEARCH_SORT_TO_SHOP_SORT: Record<string, ShopPublicSort> = {
  relevance: 'featured',
  price_asc: 'price-low-high',
  price_desc: 'price-high-low',
  rating: 'highest-rated',
  rating_desc: 'highest-rated',
  popularity: 'best-selling',
  newest: 'newest',
  name_asc: 'a-z',
  name_desc: 'z-a',
  discount_desc: 'biggest-discount',
};

/**
 * Normalizes any sort string (public or internal) to a valid SearchApiSort key.
 * Always falls back to 'relevance' safely.
 */
export function normalizeShopSort(sort: string | null | undefined): SearchApiSort {
  switch (sort) {
    case 'featured':
      return 'relevance';
    case 'price-low-high':
      return 'price_asc';
    case 'price-high-low':
      return 'price_desc';
    case 'highest-rated':
      return 'rating';
    case 'best-selling':
      return 'popularity';
    case 'a-z':
      return 'name_asc';
    case 'z-a':
      return 'name_desc';
    case 'biggest-discount':
    case 'discount_desc':
      return 'discount_desc';
    case 'relevance':
    case 'price_asc':
    case 'price_desc':
    case 'newest':
    case 'rating':
    case 'popularity':
    case 'name_asc':
    case 'name_desc':
      return sort as SearchApiSort;
    default:
      return 'relevance';
  }
}

/**
 * Frontend convenience helper: maps Shop SortOption to SearchApiSort.
 */
export function mapShopSortToSearchApiSort(sort?: string | null): SearchApiSort {
  switch (sort) {
    case 'price-low-high':
      return 'price_asc';
    case 'price-high-low':
      return 'price_desc';
    case 'newest':
      return 'newest';
    case 'highest-rated':
      return 'rating';
    case 'best-selling':
      return 'popularity';
    case 'biggest-discount':
      return 'discount_desc';
    case 'a-z':
      return 'name_asc';
    case 'z-a':
      return 'name_desc';
    default:
      return normalizeShopSort(sort);
  }
}
