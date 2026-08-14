'use client';

import { track } from '@/lib/tracking/manager';
import {
  buildMetaCommerceBrowserEvent,
  buildMetaCommercePayload,
  type MetaBrowserCommerceItem,
} from '@/lib/meta/browser/commerce';
import { metaBrowserDebug } from '@/lib/meta/browser/diagnostics';
import type { TrackingEventData } from '@/types/tracking';
import { canRunClientTracking } from '@/lib/tracking/client-traffic-filter';

type TrackableCartItem = MetaBrowserCommerceItem & {
  id: string;
  productId?: string;
  variantId?: string | null;
  sku?: string | null;
  productSku?: string | null;
  variantSku?: string | null;
  name: string;
  price: number;
  quantity: number;
  variantName?: string | null;
  size?: string | null;
  color?: string | null;
};

type TrackableProductVariant = {
  id: string;
  sku?: string | null;
  name?: string | null;
  price?: number | null;
  attributes?: Record<string, string> | null;
};

type TrackableProduct = {
  id: string;
  sku?: string | null;
  name: string;
  price: number;
  salePrice?: number | null;
  category?: string | null;
  brand?: string | null;
  variants?: TrackableProductVariant[];
  selectedVariantId?: string | null;
};

type CommerceEventName =
  | 'AddToCart'
  | 'ViewCart'
  | 'InitiateCheckout'
  | 'AddShippingInfo'
  | 'AddPaymentInfo'
  | 'ViewContent';

function toMoney(value: number | undefined | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.round(value * 100) / 100;
}

function compactStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

function getAttributeValue(attributes: Record<string, string> | null | undefined, keys: string[]) {
  if (!attributes) return null;

  for (const key of keys) {
    const exact = attributes[key];
    if (exact) return exact;
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, value] of Object.entries(attributes)) {
    if (normalizedKeys.has(key.toLowerCase()) && value) return value;
  }

  return null;
}

function postProductAnalytics(payload: Record<string, unknown>) {
  if (typeof window === 'undefined' || !canRunClientTracking()) return;

  try {
    const body = JSON.stringify(payload);
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

function trackCommerceItems(
  eventName: CommerceEventName,
  items: TrackableCartItem[],
  options: {
    value?: number;
    viewContentHasVariants?: boolean;
    extra?: TrackingEventData;
  } = {}
) {
  const metaEvent = buildMetaCommerceBrowserEvent({
    eventName,
    items,
    value: options.value,
    currency: 'BDT',
    viewContentHasVariants: options.viewContentHasVariants,
    extra: options.extra,
  });

  if (!metaEvent.validation.valid) {
    metaBrowserDebug('warn', 'Commerce event failed browser contract validation', metaEvent);
  }

  try {
    track(eventName, metaEvent.payload, { metaEventId: metaEvent.eventId });
  } catch {
    // Tracking must never block shopping flows.
  }
}

export function buildCartTrackingData(
  items: TrackableCartItem[],
  value = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
): TrackingEventData {
  return buildMetaCommercePayload({
    eventName: 'InitiateCheckout',
    items,
    value,
    currency: 'BDT',
  });
}

export function trackAddToCart(item: TrackableCartItem, quantity = item.quantity) {
  const trackedQuantity = Math.max(1, quantity);
  const trackingItem = { ...item, quantity: trackedQuantity, item_price: item.price };

  trackCommerceItems('AddToCart', [trackingItem], {
    value: item.price * trackedQuantity,
    extra: {
      content_name: item.name,
      variant_name: item.variantName ?? undefined,
      variant_attributes: compactStrings([item.size, item.color]).join(' / ') || undefined,
    },
  });

  postProductAnalytics({
    action: 'add_to_cart',
    items: toProductAnalyticsItems([trackingItem]),
  });
}

export function trackAddToCartBundle(items: TrackableCartItem[], contentName = 'Product bundle') {
  if (items.length === 0) return;

  const trackingItems = items.map((item) => ({
    ...item,
    quantity: Math.max(1, item.quantity),
    item_price: item.price,
  }));
  const value = trackingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  trackCommerceItems('AddToCart', trackingItems, {
    value,
    extra: {
      content_name: contentName,
      bundle_item_count: trackingItems.length,
    },
  });

  postProductAnalytics({
    action: 'add_to_cart',
    items: toProductAnalyticsItems(trackingItems),
  });
}

export function trackViewCart(items: TrackableCartItem[], value?: number) {
  if (items.length === 0) return;
  const data = buildCartTrackingData(items, value);
  if (!data.value || data.value <= 0) return;

  trackCommerceItems('ViewCart', items, {
    value: data.value,
    extra: { checkout_step: 'cart_review' },
  });

  postProductAnalytics({
    action: 'view_cart',
    items: toProductAnalyticsItems(items),
  });
}

export function trackInitiateCheckout(items: TrackableCartItem[], value?: number) {
  if (items.length === 0) return;
  const data = buildCartTrackingData(items, value);
  if (!data.value || data.value <= 0) return;

  trackCommerceItems('InitiateCheckout', items, {
    value: data.value,
    extra: { checkout_step: 'begin_checkout' },
  });

  postProductAnalytics({
    action: 'checkout_start',
    items: toProductAnalyticsItems(items),
  });
}

export function trackAddShippingInfo(
  items: TrackableCartItem[],
  value: number | undefined,
  shippingTier?: string
) {
  if (items.length === 0) return;
  const data = buildCartTrackingData(items, value);
  if (!data.value || data.value <= 0) return;

  trackCommerceItems('AddShippingInfo', items, {
    value: data.value,
    extra: {
      checkout_step: 'shipping_info',
      shipping_tier: shippingTier || 'Pathao Home Delivery',
    },
  });

  postProductAnalytics({
    action: 'checkout_shipping_info',
    items: toProductAnalyticsItems(items),
  });
}

export function trackAddPaymentInfo(
  items: TrackableCartItem[],
  value: number | undefined,
  paymentType?: string
) {
  if (items.length === 0) return;
  const data = buildCartTrackingData(items, value);
  if (!data.value || data.value <= 0) return;

  trackCommerceItems('AddPaymentInfo', items, {
    value: data.value,
    extra: {
      checkout_step: 'payment_info',
      payment_type: paymentType,
    },
  });

  postProductAnalytics({
    action: 'checkout_payment_info',
    items: toProductAnalyticsItems(items),
  });
}

export function trackProductView(product: TrackableProduct) {
  const selectedVariant = product.selectedVariantId
    ? product.variants?.find((variant) => variant.id === product.selectedVariantId) ?? null
    : null;
  const selectedVariantPrice = toMoney(selectedVariant?.price);
  const basePrice = toMoney(product.salePrice && product.salePrice > 0 ? product.salePrice : product.price);
  const price = selectedVariantPrice && selectedVariantPrice > 0 ? selectedVariantPrice : basePrice;
  if (!price || price <= 0) return;

  const hasVariants = Boolean(product.variants?.length);
  const variantSize = getAttributeValue(selectedVariant?.attributes, ['size', 'Size']);
  const variantColor = getAttributeValue(selectedVariant?.attributes, ['color', 'Color', 'shade', 'Shade']);
  const variantName = selectedVariant
    ? compactStrings([variantSize, variantColor]).join(' / ') || selectedVariant.name || undefined
    : undefined;
  const contentItem: TrackableCartItem = {
    id: selectedVariant?.id ?? product.id,
    productId: product.id,
    productSku: product.sku,
    variantId: selectedVariant?.id ?? null,
    variantSku: selectedVariant?.sku ?? null,
    sku: selectedVariant?.sku ?? product.sku,
    variantName,
    size: variantSize,
    color: variantColor,
    quantity: 1,
    price,
    name: product.name,
  };

  trackCommerceItems('ViewContent', [contentItem], {
    value: price,
    viewContentHasVariants: hasVariants,
    extra: {
      content_name: product.name,
      content_category: product.category ?? undefined,
      variant_name: variantName,
      variant_attributes: compactStrings([variantSize, variantColor]).join(' / ') || undefined,
      sku: selectedVariant?.sku ?? product.sku ?? undefined,
      brand: product.brand ?? undefined,
    },
  });

  postProductAnalytics({
    action: 'view',
    productId: product.id,
  });
}
