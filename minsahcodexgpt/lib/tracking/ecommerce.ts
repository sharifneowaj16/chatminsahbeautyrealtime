'use client';

import { track } from '@/lib/tracking/manager';
import { getMetaContentId, getUniqueMetaContentIds } from '@/lib/tracking/meta-content-id';
import type { TrackingEventData } from '@/types/tracking';

type TrackableCartItem = {
  id: string;
  productId?: string;
  variantId?: string | null;
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
  const contentIds = getUniqueMetaContentIds(items);
  const contents = items.map((item) => {
    const itemPrice = toMoney(item.price) ?? 0;

    return {
      id: getMetaContentId(item),
      quantity: Math.max(1, item.quantity),
      item_price: itemPrice,
      price: itemPrice,
    };
  });

  return {
    content_ids: contentIds,
    content_type: 'product',
    contents,
    value: toMoney(value),
    currency: 'BDT',
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function trackAddToCart(item: TrackableCartItem, quantity = item.quantity) {
  const trackedQuantity = Math.max(1, quantity);
  const itemPrice = toMoney(item.price) ?? 0;

  trackSafely('AddToCart', {
    content_ids: [getMetaContentId(item)],
    content_name: item.name,
    content_type: 'product',
    contents: [
      {
        id: getMetaContentId(item),
        quantity: trackedQuantity,
        item_price: itemPrice,
        price: itemPrice,
      },
    ],
    value: toMoney(item.price * trackedQuantity),
    currency: 'BDT',
    num_items: trackedQuantity,
    product_id: item.productId ?? item.id,
    variant_id: item.variantId ?? undefined,
    variant_name: item.variantName ?? undefined,
    variant_attributes: compactStrings([item.size, item.color]).join(' / ') || undefined,
  });
}

export function trackInitiateCheckout(items: TrackableCartItem[], value?: number) {
  if (items.length === 0) return;
  const data = buildCartTrackingData(items, value);
  if (!data.value || data.value <= 0) return;
  trackSafely('InitiateCheckout', data);
}

export function trackProductView(product: TrackableProduct) {
  const price = toMoney(product.salePrice && product.salePrice > 0 ? product.salePrice : product.price);
  if (!price || price <= 0) return;

  const contentId = product.id;
  const hasVariants = Boolean(product.variants?.length);

  trackSafely('ViewContent', {
    content_ids: [contentId],
    content_name: product.name,
    content_category: product.category ?? undefined,
    content_type: hasVariants ? 'product_group' : 'product',
    contents: [
      {
        id: contentId,
        quantity: 1,
        item_price: price,
        price,
      },
    ],
    value: price,
    currency: 'BDT',
    num_items: 1,
    product_id: product.id,
    sku: product.sku,
    brand: product.brand ?? undefined,
  });
}
