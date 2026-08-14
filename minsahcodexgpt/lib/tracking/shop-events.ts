'use client';

import type { Product } from '@/types/product';


type ShopEventName =
  | 'view_item_list'
  | 'select_item'
  | 'search'
  | 'filter_open'
  | 'sort_open'
  | 'filter_apply'
  | 'sort_apply'
  | 'add_to_cart'
  | 'buy_now_click'
  | 'wishlist_add'
  | 'empty_result'
  | 'clear_filter'
  | 'page_change';

type ShopItemPayload = {
  item_id: string;
  item_name: string;
  brand?: string;
  category?: string;
  item_brand?: string;
  item_category?: string;
  price: number;
  discount?: number;
  position?: number;
  index?: number;
  list_name?: string;
  item_list_name?: string;
  availability?: string;
  variant_id?: string;
};

export type ShopAnalyticsFilters = {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: number;
  inStock?: boolean;
  rating?: string;
};

const PUBLIC_SORT_VALUES = new Set([
  'featured',
  'best-selling',
  'newest',
  'price-low-high',
  'price-high-low',
  'highest-rated',
  'biggest-discount',
]);

function buildEventId(eventName: ShopEventName): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${eventName}_${Date.now()}_${randomPart}`;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function cleanFilters(filters?: ShopAnalyticsFilters): ShopAnalyticsFilters | undefined {
  if (!filters) return undefined;
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as ShopAnalyticsFilters;
}

function ensurePublicSort(sortValue: string | null | undefined) {
  if (!sortValue) return 'cleared';
  return PUBLIC_SORT_VALUES.has(sortValue) ? sortValue : 'featured';
}

export function buildShopItem(product: Product, index?: number, listName = 'Shop Product Grid'): ShopItemPayload {
  return {
    item_id: product.id,
    item_name: product.name,
    brand: product.brand || undefined,
    category: product.category || undefined,
    item_brand: product.brand || undefined,
    item_category: product.category || undefined,
    price: toNumber(product.price),
    discount: product.discount || undefined,
    position: index,
    index,
    list_name: listName,
    item_list_name: listName,
    availability: product.stock > 0 ? 'in_stock' : 'out_of_stock',
  };
}

function pushShopEvent(eventName: ShopEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  const event_id = buildEventId(eventName);
  const enrichedPayload = {
    ...payload,
    event_id,
    currency: payload.currency || 'BDT',
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...enrichedPayload });

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, enrichedPayload);
  }

  const body = JSON.stringify({
    event: eventName,
    data: enrichedPayload,
    timestamp: Date.now(),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/tracking/events', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch('/api/tracking/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never block shopping UX.
  });
}

export function trackShopViewItemList(
  products: Product[],
  listName = 'Shop Product Grid',
  filters?: ShopAnalyticsFilters
) {
  if (!products.length) return;

  const items = products.slice(0, 20).map((product, index) => buildShopItem(product, index + 1, listName));
  pushShopEvent('view_item_list', {
    item_list_name: listName,
    list_name: listName,
    filters: cleanFilters(filters),
    page: filters?.page,
    items,
    value: items.reduce((sum, item) => sum + toNumber(item.price), 0),
  });
}

export function trackShopSelectItem(
  product: Product,
  index?: number,
  listName = 'Shop Product Grid',
  filters?: ShopAnalyticsFilters
) {
  pushShopEvent('select_item', {
    item_list_name: listName,
    list_name: listName,
    filters: cleanFilters(filters),
    items: [buildShopItem(product, index, listName)],
  });
}

export function trackShopSearch(searchTerm: string, source = 'shop_search_bar') {
  const trimmed = searchTerm.trim();
  if (!trimmed) return;

  pushShopEvent('search', {
    search_term: trimmed,
    search_string: trimmed,
    source,
  });
}

export function trackShopSuggestionClick(searchTerm: string, suggestionType: string, position: number) {
  const trimmed = searchTerm.trim();
  if (!trimmed) return;

  pushShopEvent('search', {
    search_term: trimmed,
    search_string: trimmed,
    source: 'shop_search_suggestion',
    suggestion_type: suggestionType,
    position,
  });
}

export function trackShopFilterOpen(source = 'mobile_sticky_bar') {
  pushShopEvent('filter_open', { source });
}

export function trackShopSortOpen(source = 'mobile_sticky_sort') {
  pushShopEvent('sort_open', { source });
}

export function trackShopFilterApply(
  filterName: string,
  filterValue: string | null,
  totalProducts?: number,
  filters?: ShopAnalyticsFilters
) {
  pushShopEvent('filter_apply', {
    filter_name: filterName,
    filter_value: filterValue || 'cleared',
    total_products: totalProducts,
    filters: cleanFilters(filters),
  });
}

export function trackShopClearFilter(filterName = 'all', totalProducts?: number, filters?: ShopAnalyticsFilters) {
  pushShopEvent('clear_filter', {
    filter_name: filterName,
    total_products: totalProducts,
    filters: cleanFilters(filters),
  });
}

export function trackShopSortApply(sortValue: string | null, totalProducts?: number, filters?: ShopAnalyticsFilters) {
  pushShopEvent('sort_apply', {
    sort_value: ensurePublicSort(sortValue),
    total_products: totalProducts,
    filters: cleanFilters(filters),
  });
}

export function trackShopPageChange(page: number, totalProducts?: number, filters?: ShopAnalyticsFilters) {
  pushShopEvent('page_change', {
    page,
    total_products: totalProducts,
    filters: cleanFilters(filters),
  });
}

export function trackShopAddToCart(
  product: Product,
  quantity = 1,
  index?: number,
  listName = 'Shop Product Grid',
  filters?: ShopAnalyticsFilters,
  variantId?: string | null
) {
  const item = buildShopItem(product, index, listName);
  pushShopEvent('add_to_cart', {
    item_list_name: listName,
    list_name: listName,
    filters: cleanFilters(filters),
    value: toNumber(product.price) * Math.max(1, quantity),
    items: [{ ...item, variant_id: variantId || undefined }],
  });
}

export function trackShopBuyNowClick(product: Product, index?: number, listName = 'Shop Product Grid') {
  // Intent-only event. Do not map this to Purchase/Lead conversion.
  pushShopEvent('buy_now_click', {
    item_list_name: listName,
    list_name: listName,
    intent_only: true,
    value: toNumber(product.price),
    items: [buildShopItem(product, index, listName)],
  });
}

export function trackShopWishlistAdd(product: Product, index?: number, listName = 'Shop Product Grid') {
  pushShopEvent('wishlist_add', {
    item_list_name: listName,
    list_name: listName,
    items: [buildShopItem(product, index, listName)],
  });
}

export function trackShopEmptyResult(query: string, totalProducts: number, filters?: ShopAnalyticsFilters) {
  pushShopEvent('empty_result', {
    search_term: query || undefined,
    total_products: totalProducts,
    filters: cleanFilters(filters),
  });
}
