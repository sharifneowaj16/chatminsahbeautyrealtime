'use client';

import { track } from '@/lib/tracking/manager';
import { buildMetaCommerceBrowserEvent } from '@/lib/meta/browser/commerce';
import { metaBrowserDebug } from '@/lib/meta/browser/diagnostics';
import type { TrackingEvent, TrackingEventData } from '@/types/tracking';

function trackSafely(event: TrackingEvent, data?: TrackingEventData, metaEventId?: string) {
  try {
    track(event, data, { metaEventId });
  } catch {
    // Marketing analytics must never block or break storefront UX.
  }
}

function compactStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

export function trackSearchEvent({
  query,
  resultCount,
  page,
  category,
  brand,
  minPrice,
  maxPrice,
  sort,
  inStockOnly,
}: {
  query: string;
  resultCount?: number;
  page?: number;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  inStockOnly?: boolean;
}) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return;

  trackSafely('Search', {
    search_string: normalizedQuery,
    search_term: normalizedQuery,
    content_category: category || undefined,
    content_name: compactStrings([brand, sort]).join(' / ') || undefined,
    result_count: typeof resultCount === 'number' ? resultCount : undefined,
    page,
    category: category || undefined,
    brand: brand || undefined,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
    sort: sort || undefined,
    in_stock_only: Boolean(inStockOnly),
  });
}

export function trackCompleteRegistrationEvent({
  method = 'email',
  status = 'success',
}: {
  method?: 'email' | 'google' | 'facebook' | string;
  status?: 'success' | string;
} = {}) {
  trackSafely('CompleteRegistration', {
    method,
    status,
    content_name: 'Account registration',
  });
}

export function trackContactEvent({
  method,
  label,
}: {
  method: 'form_mailto' | 'email' | 'phone' | string;
  label?: string;
}) {
  trackSafely('Contact', {
    method,
    status: 'intent',
    content_name: label || 'Contact',
  });
}

export function trackAddToWishlistEvent({
  productId,
  productSku,
  variantId,
  variantSku,
  productName,
  value,
  currency = 'BDT',
  category,
}: {
  productId: string;
  productSku?: string;
  variantId?: string;
  variantSku?: string;
  productName?: string;
  value?: number;
  currency?: string;
  category?: string;
}) {
  if (!productId) return;

  const metaEvent = buildMetaCommerceBrowserEvent({
    eventName: 'AddToWishlist',
    items: [{
      productId,
      productSku,
      variantId,
      variantSku,
      quantity: 1,
      price: value,
    }],
    value,
    currency,
    extra: {
      content_name: productName,
      content_category: category,
    },
  });

  if (!metaEvent.validation.valid) {
    metaBrowserDebug('warn', 'Wishlist event failed browser contract validation', metaEvent);
  }
  trackSafely('AddToWishlist', metaEvent.payload, metaEvent.eventId);
}

export function trackDeliveryMessageViewed({
  messageType,
  productId,
  productSlug,
}: {
  messageType: 'PRODUCT_FREE' | 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER';
  productId?: string | null;
  productSlug?: string | null;
}) {
  try {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'delivery_message_viewed',
        message_type: messageType,
        product_id: productId || undefined,
        product_slug: productSlug || undefined,
      });
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'delivery_message_viewed', {
          message_type: messageType,
          product_id: productId || undefined,
          product_slug: productSlug || undefined,
        });
      }
    }
  } catch {
    // Non-blocking
  }
}

export function trackDeliveryMessageClicked({
  messageType,
  productId,
  productSlug,
}: {
  messageType: 'PRODUCT_FREE' | 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER';
  productId?: string | null;
  productSlug?: string | null;
}) {
  try {
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'delivery_message_clicked',
        message_type: messageType,
        product_id: productId || undefined,
        product_slug: productSlug || undefined,
      });
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'delivery_message_clicked', {
          message_type: messageType,
          product_id: productId || undefined,
          product_slug: productSlug || undefined,
        });
      }
    }
  } catch {
    // Non-blocking
  }
}

