'use client';

import { track } from '@/lib/tracking/manager';
import {
  buildMetaCatalogContentIds,
  buildMetaCatalogContents,
  getMetaCatalogContentType,
} from '@/lib/tracking/meta-content-id';
import type { TrackingEventData } from '@/types/tracking';
import { canRunClientTracking } from '@/lib/tracking/client-traffic-filter';

type TrackableCartItem = {
  id: string;
  productId?: string;
  variantId?: string | null;
  sku?: string | null;
  name: string;
  price: number;
  quantity: number;
  variantName?: string | null;
  size?: string | null;
  color?: string | null;
};

type TrackableProduct = {
  id: string;
  sku?: string;
  name: string;
  price: number;
  salePrice?: number | null;
  category?: string | null;
  brand?: string | null;
  variants?: Array<{ id: string }>;
};

function toMoney(value: number | undefined | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.round(value * 100) / 100;
}

function compactStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}


function postProductAnalytics(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!canRunClientTracking()) return;

  try {
    const body = JSON.stringify(payload);
    // Product analytics is non-critical and must never block shopping.
    // keepalive lets product-view/add-to-cart/checkout counters survive quick navigation.
    fetch('/api/product-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
      keepalive: body.length < 60_000,
    }).catch(() => null);
  } catch {
    // Product metrics must never break Pixel/CAPI/GA4 or storefront UX.
  }
}

function toProductAnalyticsItems(items: TrackableCartItem[]) {
  return items
    .map((item) => ({
      productId: item.productId ?? item.id,
      quantity: item.quantity,
    }))
    .filter((item) => Boolean(item.productId));
}

function trackSafely(event: 'AddToCart' | 'InitiateCheckout' | 'ViewContent', data: TrackingEventData) {
  try {
    track(event, data);
  } catch {
    // Tracking must never block shopping flows.
  }
}

export function buildCartTrackingData(
  items: TrackableCartItem[],
  value = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
): TrackingEventData {
  const contentIds = buildMetaCatalogContentIds(items);
  const contents = buildMetaCatalogContents(items);

  return {
    content_ids: contentIds,
    content_type: getMetaCatalogContentType(items),
    contents,
    value: toMoney(value),
    currency: 'BDT',
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function trackAddToCart(item: TrackableCartItem, quantity = item.quantity) {
  const trackedQuantity = Math.max(1, quantity);
  const trackingItem = { ...item, quantity: trackedQuantity, item_price: item.price };
  const contents = buildMetaCatalogContents([trackingItem]);
  const contentIds = buildMetaCatalogContentIds([trackingItem]);

  trackSafely('AddToCart', {
    content_ids: contentIds,
    content_name: item.name,
    content_type: getMetaCatalogContentType([trackingItem]),
    contents,
    value: toMoney(item.price * trackedQuantity),
    currency: 'BDT',
    num_items: trackedQuantity,
    product_id: item.productId ?? item.id,
    variant_id: item.variantId ?? undefined,
    variant_name: item.variantName ?? undefined,
    variant_attributes: compactStrings([item.size, item.color]).join(' / ') || undefined,
  });

  postProductAnalytics({
    action: 'add_to_cart',
    items: toProductAnalyticsItems([trackingItem]),
  });
}

export function trackInitiateCheckout(items: TrackableCartItem[], value?: number) {
  if (items.length === 0) return;
  const data = buildCartTrackingData(items, value);
  if (!data.value || data.value <= 0) return;
  trackSafely('InitiateCheckout', data);

  postProductAnalytics({
    action: 'checkout_start',
    items: toProductAnalyticsItems(items),
  });
}

export function trackProductView(product: TrackableProduct) {
  const price = toMoney(product.salePrice && product.salePrice > 0 ? product.salePrice : product.price);
  if (!price || price <= 0) return;

  const hasVariants = Boolean(product.variants?.length);
  const contentItem = {
    id: product.id,
    productId: product.id,
    sku: product.sku,
    quantity: 1,
    price,
  };

  trackSafely('ViewContent', {
    content_ids: buildMetaCatalogContentIds([contentItem]),
    content_name: product.name,
    content_category: product.category ?? undefined,
    content_type: hasVariants ? 'product_group' : 'product',
    contents: buildMetaCatalogContents([contentItem]),
    value: price,
    currency: 'BDT',
    num_items: 1,
    product_id: product.id,
    sku: product.sku,
    brand: product.brand ?? undefined,
  });

  postProductAnalytics({
    action: 'view',
    productId: product.id,
  });
}
