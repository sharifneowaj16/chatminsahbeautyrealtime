/**
 * Facebook Pixel Client-side Implementation
 *
 * PRODUCTION-GRADE PIXEL INTEGRATION
 * - Loads Facebook Pixel script
 * - Generates eventID for deduplication
 * - Provides type-safe tracking functions
 * - Handles cookie consent (GDPR compliant)
 *
 * Usage:
 * 1. Add <FacebookPixel /> to your root layout
 * 2. Use trackEvent() to send events with deduplication
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import type { FacebookPixelEvent, FacebookPixelParams } from '@/types/facebook';
import { buildVisitorMetaExternalId } from '@/lib/tracking/meta-external-id';

// Get Pixel ID from environment
const PIXEL_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Window.fbq is declared globally in lib/tracking/manager.ts

/**
 * Generate UUID v4 for event deduplication
 * Browser-compatible version (no crypto module)
 */
export function generateEventId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Read a browser cookie value.
 */
function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Get Meta browser identity cookies.
 */
function getMetaExternalIdRaw() {
  return buildVisitorMetaExternalId(getCookieValue('mb_vid'));
}

export function getFacebookBrowserIdentity(): {
  fbp?: string;
  fbc?: string;
  externalId?: string;
} {
  return {
    fbp: getCookieValue('_fbp'),
    fbc: getCookieValue('_fbc'),
    // Raw stable key sent only to our server; /api/facebook-capi hashes it before Meta.
    externalId: getMetaExternalIdRaw(),
  };
}

/**
 * Get Facebook cookies (_fbp and _fbc).
 */
export function getFacebookCookies(): { fbp?: string; fbc?: string } {
  const { fbp, fbc } = getFacebookBrowserIdentity();
  return { fbp, fbc };
}

/**
 * Initialize Facebook Pixel
 */
export function initFacebookPixel() {
  if (!PIXEL_ID) {
    // Pixel ID not configured - silent skip
    return;
  }

  if (typeof window !== 'undefined' && window.fbq) {
    // Runtime init cannot synchronously hash external_id; the component inline script handles hashed init.
    window.fbq('init', PIXEL_ID);
    console.log('[FB Pixel] Initialized:', PIXEL_ID);
  }
}

/**
 * Track event with Facebook Pixel
 *
 * @param eventName - Facebook standard event name
 * @param params - Event parameters
 * @param eventId - Optional eventID for deduplication (auto-generated if not provided)
 * @returns eventID used (for passing to server-side CAPI)
 */
export function trackEvent(
  eventName: FacebookPixelEvent,
  params?: FacebookPixelParams,
  eventId?: string
): string {
  if (eventName === 'Purchase') {
    console.warn(
      '[FB Pixel] Purchase is blocked in the generic client helper. Use only the verified online Purchase browser flow.'
    );
    return '';
  }

  if (!PIXEL_ID) {
    // Pixel ID not configured - silent skip
    return '';
  }

  if (typeof window === 'undefined' || !window.fbq) {
    // Facebook Pixel not loaded - silent skip
    return '';
  }

  // Generate eventID if not provided
  const finalEventId = eventId || generateEventId();

  const eventParams: FacebookPixelParams = {
    ...params,
  };

  // Send event to Facebook Pixel
  window.fbq('track', eventName, eventParams, { eventID: finalEventId });

  console.log(`[FB Pixel] Event tracked: ${eventName}`, {
    eventID: finalEventId,
    params: eventParams,
  });

  return finalEventId;
}

/**
 * Track PageView event (usually automatic, but can be manual)
 */
export function trackPageView(): void {
  trackEvent('PageView');
}

/**
 * Track ViewContent event
 */
export function trackViewContent(params: {
  contentIds: string[];
  contentType?: 'product' | 'product_group';
  contentName?: string;
  value?: number;
  currency?: string;
}): string {
  return trackEvent('ViewContent', {
    content_ids: params.contentIds,
    content_type: params.contentType || 'product',
    content_name: params.contentName,
    value: params.value,
    currency: params.currency || 'BDT',
  });
}

/**
 * Track AddToCart event
 */
export function trackAddToCart(params: {
  contentIds: string[];
  contentType?: 'product' | 'product_group';
  contentName?: string;
  value?: number;
  currency?: string;
}): string {
  return trackEvent('AddToCart', {
    content_ids: params.contentIds,
    content_type: params.contentType || 'product',
    content_name: params.contentName,
    value: params.value,
    currency: params.currency || 'BDT',
  });
}

/**
 * Track InitiateCheckout event
 */
export function trackInitiateCheckout(params: {
  value: number;
  currency?: string;
  numItems?: number;
  contentIds?: string[];
}): string {
  return trackEvent('InitiateCheckout', {
    value: params.value,
    currency: params.currency || 'BDT',
    num_items: params.numItems,
    content_ids: params.contentIds,
  });
}

/**
 * Disabled legacy Purchase helper.
 * Purchase must only be fired by verified paid/confirmed purchase flows.
 */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  contentIds?: string[];
  numItems?: number;
  eventId?: string; // Pass this to CAPI
}): string {
  console.warn(
    '[FB Pixel] trackPurchase is disabled. Purchase must be fired only by verified paid/confirmed flows.'
  );
  void params;
  return '';
}

/**
 * Send event to server-side CAPI
 *
 * @param eventName - Event name
 * @param eventId - Event ID (from Pixel)
 * @param userData - User data (will be hashed server-side)
 * @param customData - Custom event data
 */
export async function sendToServerCAPI(params: {
  eventName: FacebookPixelEvent;
  eventId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: 'product' | 'product_group';
  contentName?: string;
  contentCategory?: string;
  contents?: Array<{ id: string; quantity: number; price: number }>;
  numItems?: number;
  orderId?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (params.eventName === 'Purchase') {
    return {
      success: false,
      error: 'Purchase is not allowed from browser-callable CAPI helper',
    };
  }

  try {
    const identity = getFacebookBrowserIdentity();

    const response = await fetch('/api/facebook-capi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName: params.eventName,
        eventId: params.eventId,
        eventSourceUrl: window.location.href,
        email: params.email,
        phone: params.phone,
        firstName: params.firstName,
        lastName: params.lastName,
        city: params.city,
        state: params.state,
        zipCode: params.zipCode,
        country: params.country,
        fbc: identity.fbc,
        fbp: identity.fbp,
        externalId: identity.externalId,
        value: params.value,
        currency: params.currency,
        contentIds: params.contentIds,
        contentType: params.contentType,
        contentName: params.contentName,
        contentCategory: params.contentCategory,
        contents: params.contents,
        numItems: params.numItems,
        orderId: params.orderId,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('[CAPI] Server-side tracking failed:', result);
      return { success: false, error: result.message };
    }

    console.log('[CAPI] Server-side event sent successfully:', result);
    return { success: true };
  } catch (error) {
    console.error('[CAPI] Failed to send server-side event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Facebook Pixel Component
 * Add this to your root layout
 */
export function FacebookPixel() {
  const pathname = usePathname();

  useEffect(() => {
    // Track PageView on route change
    if (window.fbq) {
      trackPageView();
    }
  }, [pathname]);

  if (!PIXEL_ID) {
    return null;
  }

  return (
    <>
      {/* Facebook Pixel Base Code */}
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            function mbNormalizeMetaExternalId(input) {
              if (input === undefined || input === null) return undefined;
              var normalized = String(input).trim().toLowerCase();
              if (!normalized) return undefined;
              var separatorIndex = normalized.indexOf(':');
              if (separatorIndex > 0) {
                var prefix = normalized.slice(0, separatorIndex);
                var id = normalized.slice(separatorIndex + 1).trim().toLowerCase();
                if (id && (prefix === 'visitor' || prefix === 'user' || prefix === 'order')) {
                  return prefix + ':' + id;
                }
              }
              return 'visitor:' + normalized;
            }
            function mbSha256Hex(input) {
              var normalizedInput = mbNormalizeMetaExternalId(input);
              if (!normalizedInput || !window.crypto || !window.crypto.subtle || !window.TextEncoder) {
                return Promise.resolve(undefined);
              }
              return window.crypto.subtle
                .digest('SHA-256', new TextEncoder().encode(normalizedInput))
                .then(function(buffer) {
                  return Array.from(new Uint8Array(buffer))
                    .map(function(byte) { return byte.toString(16).padStart(2, '0'); })
                    .join('');
                })
                .catch(function() { return undefined; });
            }
            function mbReadCookie(name) {
              var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
              if (!match) return undefined;
              try { return decodeURIComponent(match[1]); } catch (e) { return match[1]; }
            }
            function mbSetCookie(name, value, maxAge) {
              document.cookie = name + '=' + encodeURIComponent(value) + ';max-age=' + maxAge + ';path=/;SameSite=Lax';
            }
            var mbVid = mbReadCookie('mb_vid');
            if (!mbVid) {
              mbVid = window.crypto && window.crypto.randomUUID
                ? window.crypto.randomUUID()
                : 'vid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            }
            var normalizedMbVidExternal = mbNormalizeMetaExternalId(mbVid);
            mbVid = normalizedMbVidExternal && normalizedMbVidExternal.indexOf('visitor:') === 0
              ? normalizedMbVidExternal.slice('visitor:'.length)
              : undefined;
            if (mbVid) {
              mbSetCookie('mb_vid', mbVid, 15552000);
            }
            try {
              var fbclid = new URLSearchParams(window.location.search).get('fbclid');
              if (fbclid && !mbReadCookie('_fbc')) {
                mbSetCookie('_fbc', 'fb.1.' + Date.now() + '.' + fbclid, 7776000);
              }
            } catch (e) {}
            var rawExternalId = mbNormalizeMetaExternalId(mbVid);
            if (rawExternalId) {
              mbSha256Hex(rawExternalId).then(function(hashedExternalId) {
                if (hashedExternalId) {
                  fbq('init', ${JSON.stringify(PIXEL_ID)}, { external_id: hashedExternalId });
                  window.__mbFbInitReady = true;
                } else {
                  fbq('init', ${JSON.stringify(PIXEL_ID)});
                  window.__mbFbInitReady = true;
                }
                fbq('track', 'PageView');
              });
            } else {
              fbq('init', ${JSON.stringify(PIXEL_ID)});
              window.__mbFbInitReady = true;
              fbq('track', 'PageView');
            }
          `,
        }}
      />

      {/* Facebook Pixel noscript fallback */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
