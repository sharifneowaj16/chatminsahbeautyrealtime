'use client';

/**
 * Universal Tracking Manager
 * Centralized system to manage all tracking platforms
 */

import { TrackingEvent, TrackingEventData, AllPlatformsConfig, CustomerSession } from '@/types/tracking';
import { canRunClientTracking, getClientTrackingBlockReason } from '@/lib/tracking/client-traffic-filter';
import { buildMetaBrowserEvent, sanitizeMetaBrowserPayload } from '@/lib/meta/browser/payload';
import { dispatchMetaBrowserEvent } from '@/lib/meta/browser/client';
import { metaBrowserDebug } from '@/lib/meta/browser/diagnostics';
import type { MetaBrowserEventName } from '@/lib/meta/browser/types';

export type TrackingDispatchOptions = {
  /** Generated once at the user-action boundary and reused by Pixel + CAPI. */
  metaEventId?: string;
};

// Extend Window interface for tracking platform globals
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    __mbFbInitReady?: boolean;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[] & { __mbPurchaseGuardInstalled?: boolean };
    ttq?: {
      page?: () => void;
      track?: (...args: any[]) => void;
      ready?: (callback: () => void) => void;
    };
    __mbTikTokInitReady?: boolean;
    snaptr: (...args: any[]) => void;
    pintrk: (...args: any[]) => void;
    twq: (...args: any[]) => void;
    _linkedin_data_partner_ids: string[];
    lintrk: (...args: any[]) => void;
    rdt: (...args: any[]) => void;
    uetq: any[];
    mixpanel: { track: (...args: any[]) => void };
  }
}

type Ga4ItemPayload = Record<string, string | number | undefined>;

const GA4_ECOMMERCE_EVENTS = new Set([
  'view_item',
  'add_to_cart',
  'view_cart',
  'add_to_wishlist',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
]);

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toPositiveInteger(value: unknown, fallback = 1): number {
  const parsed = toFiniteNumber(value);
  if (parsed === undefined || parsed <= 0) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function getContentIds(data?: TrackingEventData): string[] {
  const rawIds = data?.content_ids ?? data?.contentIds;
  if (!Array.isArray(rawIds)) return [];

  return rawIds
    .map((id) => firstNonEmptyString(id))
    .filter((id): id is string => Boolean(id));
}

function buildGa4ItemFromContent(
  content: Record<string, any>,
  data?: TrackingEventData,
  index?: number
): Ga4ItemPayload | null {
  const itemId = firstNonEmptyString(content.id, content.item_id, content.product_id, content.productId);
  if (!itemId) return null;

  const itemName = firstNonEmptyString(
    content.item_name,
    content.name,
    data?.content_name,
    data?.contentName
  );
  const itemCategory = firstNonEmptyString(
    content.item_category,
    content.category,
    data?.content_category,
    data?.contentCategory
  );
  const itemVariant = firstNonEmptyString(
    content.item_variant,
    content.variant_name,
    content.variantName,
    data?.variant_name,
    data?.variantName,
    data?.variant_attributes,
    data?.variantAttributes,
    content.size && content.color ? `${content.size} / ${content.color}` : undefined,
    content.shade,
    content.color,
    content.size
  );
  const itemGroupId = firstNonEmptyString(
    content.item_group_id,
    content.itemGroupId,
    data?.item_group_id,
    data?.itemGroupId,
    data?.product_id,
    data?.productId
  );
  const price = toFiniteNumber(content.item_price ?? content.price ?? data?.value);
  const quantity = toPositiveInteger(content.quantity, 1);

  return {
    item_id: itemId,
    ...(itemName && { item_name: itemName }),
    ...(itemCategory && { item_category: itemCategory }),
    ...(itemVariant && { item_variant: itemVariant }),
    ...(itemGroupId && { item_group_id: itemGroupId }),
    ...(price !== undefined && { price }),
    quantity,
    ...(Number.isInteger(index) && { index }),
  };
}

function buildGa4Items(data?: TrackingEventData): Ga4ItemPayload[] {
  const contents = Array.isArray(data?.contents) ? data.contents : [];
  const itemsFromContents = contents
    .map((content, index) =>
      content && typeof content === 'object'
        ? buildGa4ItemFromContent(content as Record<string, any>, data, index)
        : null
    )
    .filter((item): item is Ga4ItemPayload => Boolean(item));

  if (itemsFromContents.length > 0) {
    return itemsFromContents;
  }

  return getContentIds(data)
    .map((id, index) =>
      buildGa4ItemFromContent(
        {
          id,
          quantity: data?.num_items || data?.numItems || 1,
          price: data?.value,
        },
        data,
        index
      )
    )
    .filter((item): item is Ga4ItemPayload => Boolean(item));
}

function buildGoogleEventPayload(gaEvent: string, data?: TrackingEventData): TrackingEventData {
  const payload: TrackingEventData = { ...(data ?? {}) };

  const value = toFiniteNumber(payload.value);
  if (value !== undefined) payload.value = value;
  if (!payload.currency && value !== undefined) payload.currency = 'BDT';

  if (gaEvent === 'search') {
    const searchTerm = firstNonEmptyString(payload.search_term, payload.search_string, payload.searchString);
    if (searchTerm) payload.search_term = searchTerm;
  }

  if (GA4_ECOMMERCE_EVENTS.has(gaEvent)) {
    const items = buildGa4Items(payload);
    if (items.length > 0) {
      payload.items = items;
    }
  }

  return payload;
}


type TikTokContentPayload = {
  content_id: string;
  content_name?: string;
  quantity: number;
  price?: number;
};

function buildTikTokContents(data?: TrackingEventData): TikTokContentPayload[] {
  const contents = Array.isArray(data?.contents) ? data.contents : [];
  const mapped = contents
    .map((content) => {
      if (!content || typeof content !== 'object') return null;
      const item = content as Record<string, unknown>;

      const contentId = firstNonEmptyString(
        item.id,
        item.content_id,
        item.item_id,
        item.product_id,
        item.productId,
        item.variant_sku,
        item.sku
      );
      if (!contentId) return null;

      const contentName = firstNonEmptyString(
        item.content_name,
        item.item_name,
        item.name,
        data?.content_name,
        data?.contentName
      );
      const price = toFiniteNumber(item.price ?? item.item_price ?? data?.value);
      const quantity = toPositiveInteger(item.quantity, 1);

      return {
        content_id: contentId,
        ...(contentName && { content_name: contentName }),
        quantity,
        ...(price !== undefined && { price }),
      };
    })
    .filter((item): item is TikTokContentPayload => Boolean(item));

  if (mapped.length > 0) return mapped;

  return getContentIds(data).map((id) => ({
    content_id: id,
    ...(firstNonEmptyString(data?.content_name, data?.contentName) && {
      content_name: firstNonEmptyString(data?.content_name, data?.contentName),
    }),
    quantity: toPositiveInteger(data?.num_items ?? data?.numItems ?? data?.quantity, 1),
    ...(toFiniteNumber(data?.value) !== undefined && { price: toFiniteNumber(data?.value) }),
  }));
}

function buildTikTokPayload(data?: TrackingEventData): Record<string, unknown> {
  if (!data) return {};

  const payload: Record<string, unknown> = {};
  const value = toFiniteNumber(data.value);
  const contentIds = getContentIds(data);
  const contents = buildTikTokContents(data);
  const quantity = toPositiveInteger(
    data.num_items ?? data.numItems ?? data.quantity ?? contents.reduce((sum, item) => sum + (item.quantity || 1), 0),
    1
  );
  const searchString = firstNonEmptyString(data.search_string, data.search_term, data.searchString);
  const description = firstNonEmptyString(
    data.description,
    data.content_name,
    data.contentName,
    data.content_category,
    data.contentCategory
  );

  payload.content_type = firstNonEmptyString(data.content_type, data.contentType) || 'product';
  if (contentIds.length > 0) payload.content_ids = contentIds;
  if (contents.length > 0) payload.contents = contents;
  payload.quantity = quantity;
  if (description) payload.description = description;
  if (data.currency || value !== undefined) payload.currency = data.currency || 'BDT';
  if (value !== undefined) payload.value = value;
  if (searchString) payload.search_string = searchString;

  return payload;
}

class TrackingManager {
  private config: AllPlatformsConfig;
  private sessionData: CustomerSession | null = null;
  private initialized = false;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load tracking configuration from environment variables and settings
   */
  private loadConfig(): AllPlatformsConfig {
    const facebookPixelId =
      process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
      process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
      process.env.NEXT_PUBLIC_META_PIXEL_ID ||
      '';
    const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '';
    const tiktokPixelEnabled =
      process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true' && !!tiktokPixelId;

    return {
      facebook: {
        enabled: !!facebookPixelId,
        pixelId: facebookPixelId,
      },
      google: {
        enabled:
          process.env.NEXT_PUBLIC_GA_ENABLED === 'true' ||
          !!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
          !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
        measurementId:
          process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
          process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
          '',
        tagManagerId: process.env.NEXT_PUBLIC_GTM_ID,
        adsConversionId: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID,
        adsConversionLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL,
      },
      tiktok: {
        enabled: tiktokPixelEnabled,
        pixelId: tiktokPixelId,
      },
      snapchat: {
        enabled: !!process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID,
        pixelId: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID || '',
      },
      pinterest: {
        enabled: !!process.env.NEXT_PUBLIC_PINTEREST_TAG_ID,
        tagId: process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '',
      },
      twitter: {
        enabled: !!process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID,
        pixelId: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID || '',
      },
      linkedin: {
        enabled: !!process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID,
        partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || '',
      },
      reddit: {
        enabled: !!process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID,
        pixelId: process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID || '',
      },
      microsoft: {
        enabled: !!process.env.NEXT_PUBLIC_MICROSOFT_UET_TAG_ID,
        uetTagId: process.env.NEXT_PUBLIC_MICROSOFT_UET_TAG_ID || '',
      },
      hotjar: {
        enabled: !!process.env.NEXT_PUBLIC_HOTJAR_SITE_ID,
        siteId: process.env.NEXT_PUBLIC_HOTJAR_SITE_ID || '',
      },
      clarity: {
        enabled: !!process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
        projectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '',
      },
      mixpanel: {
        enabled: !!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
        token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',
      },
    };
  }

  /**
   * Initialize tracking session
   */
  initSession(): void {
    if (typeof window === 'undefined') return;
    const blockReason = getClientTrackingBlockReason();
    if (blockReason) {
      this.initialized = false;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = this.getOrCreateDeviceId();

    this.sessionData = {
      sessionId: this.generateSessionId(),
      deviceId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      events: [],
      referrer: document.referrer,
      landingPage: window.location.href,
      currentPage: window.location.href,
      utmParams: {
        source: urlParams.get('utm_source') || undefined,
        medium: urlParams.get('utm_medium') || undefined,
        campaign: urlParams.get('utm_campaign') || undefined,
        term: urlParams.get('utm_term') || undefined,
        content: urlParams.get('utm_content') || undefined,
      },
      device: {
        type: this.getDeviceType(),
        os: this.getOS(),
        browser: this.getBrowser(),
      },
    };

    // Store UTM params in localStorage for attribution
    if (this.sessionData.utmParams?.source) {
      localStorage.setItem('first_touch_utm', JSON.stringify(this.sessionData.utmParams));
    }
    localStorage.setItem('last_touch_utm', JSON.stringify(this.sessionData.utmParams));

    this.initialized = true;

    // Async DB sync — fire-and-forget, no UI blocking
    this.syncSessionToDB(deviceId, this.sessionData.utmParams);
  }

  /**
   * Sync device ID and UTM params to database
   */
  private async syncSessionToDB(
    deviceId: string,
    utmParams: CustomerSession['utmParams']
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    const hasUtmSource = !!utmParams?.source;
    const payload: Record<string, unknown> = { deviceId };

    if (hasUtmSource) {
      // Only send firstTouchUtm when there's actually a UTM source
      payload.firstTouchUtm = utmParams;
    }
    // Always update lastTouchUtm
    payload.lastTouchUtm = utmParams;

    try {
      await fetch('/api/tracking-device', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } catch {
      // Silently fail — localStorage still has the data
    }
  }

  /**
   * Track event across all enabled platforms
   */
  track(event: TrackingEvent, data?: TrackingEventData, options: TrackingDispatchOptions = {}): void {
    if (!canRunClientTracking()) return;

    if (!this.initialized) {
      this.initSession();
    }
    if (!this.initialized) return;

    // One privacy-safe browser payload is used for in-memory session data,
    // platform adapters and the analytics ingestion endpoint.
    const safeData = sanitizeMetaBrowserPayload(data);

    if (this.sessionData) {
      this.sessionData.events.push({
        event,
        timestamp: Date.now(),
        data: safeData,
      });
      this.sessionData.lastActivity = Date.now();
    }

    const enrichedData = sanitizeMetaBrowserPayload({
      ...safeData,
      ...this.sessionData?.utmParams,
    });

    if (this.config.facebook.enabled) {
      this.trackFacebook(event, enrichedData, options.metaEventId);
    }
    if (this.config.google.enabled) {
      this.trackGoogle(event, enrichedData);
    }
    if (this.config.tiktok.enabled) {
      this.trackTikTok(event, enrichedData);
    }
    if (this.config.snapchat.enabled) {
      this.trackSnapchat(event, enrichedData);
    }
    if (this.config.pinterest.enabled) {
      this.trackPinterest(event, enrichedData);
    }
    if (this.config.twitter.enabled) {
      this.trackTwitter(event, enrichedData);
    }
    if (this.config.linkedin.enabled) {
      this.trackLinkedIn(event, enrichedData);
    }
    if (this.config.reddit.enabled) {
      this.trackReddit(event, enrichedData);
    }
    if (this.config.microsoft.enabled) {
      this.trackMicrosoft(event, enrichedData);
    }
    if (this.config.mixpanel.enabled) {
      this.trackMixpanel(event, enrichedData);
    }

    this.sendToServer(event, enrichedData);
  }

  /**
   * Track on Facebook Pixel
   */
  private trackFacebook(
    event: TrackingEvent,
    data?: TrackingEventData,
    metaEventId?: string
  ): void {
    if (typeof window === 'undefined' || !canRunClientTracking()) return;

    const fbEvent = this.mapToFacebookEvent(event) as MetaBrowserEventName;
    if (fbEvent === 'Purchase') {
      // Generic Purchase remains blocked; verified online/COD flows own it.
      return;
    }

    const metaEvent = buildMetaBrowserEvent({
      eventName: fbEvent,
      eventId: metaEventId,
      payload: data,
    });
    if (!metaEvent.validation.valid) {
      metaBrowserDebug('warn', 'Manager blocked invalid Meta browser event', metaEvent);
      return;
    }

    void dispatchMetaBrowserEvent(metaEvent);
  }

  /**
   * Track on Google Analytics 4
   */
  private trackGoogle(event: TrackingEvent, data?: TrackingEventData, attempt = 0): void {
    if (typeof window === 'undefined') return;

    const gaEvent = this.mapToGoogleEvent(event);
    if (gaEvent === 'purchase') {
      console.warn(
        '[GA4] Client-side purchase is blocked. GA4 Purchase must be sent only by the verified server-side Measurement Protocol flow.'
      );
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: 'mb_ga4_purchase_blocked',
          mb_reason: 'ga4_purchase_is_server_side_measurement_protocol_only',
          mb_original_event: 'purchase',
          transaction_id: data?.transaction_id || data?.orderId,
        });
      }
      return;
    }

    if (typeof window.gtag !== 'function') {
      if (attempt < 50) {
        window.setTimeout(() => this.trackGoogle(event, data, attempt + 1), 100);
      }
      return;
    }

    window.gtag('event', gaEvent, buildGoogleEventPayload(gaEvent, data));
  }

  /**
   * Track on TikTok Pixel
   */
  private trackTikTok(event: TrackingEvent, data?: TrackingEventData, attempt = 0): void {
    if (typeof window === 'undefined') return;

    if (event === 'Purchase') {
      console.warn(
        '[TikTok] Generic client-side Purchase is blocked. TikTok Purchase must be sent only by a verified server-side Events API flow.'
      );
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: 'mb_tiktok_purchase_blocked',
          mb_reason: 'tiktok_purchase_requires_verified_server_side_events_api',
          mb_original_event: 'Purchase',
          transaction_id: data?.transaction_id || data?.orderId,
        });
      }
      return;
    }

    const isTikTokReady = !!window.ttq?.track && window.__mbTikTokInitReady === true;
    if (!isTikTokReady && attempt < 50) {
      window.setTimeout(() => this.trackTikTok(event, data, attempt + 1), 100);
      return;
    }

    if (!window.ttq?.track) {
      return;
    }

    const ttEvent = this.mapToTikTokEvent(event);
    window.ttq.track(ttEvent, buildTikTokPayload(data));
  }

  /**
   * Track on Snapchat Pixel
   */
  private trackSnapchat(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window.snaptr) return;

    const snapEvent = this.mapToSnapchatEvent(event);
    window.snaptr('track', snapEvent, data);
  }

  /**
   * Track on Pinterest Tag
   */
  private trackPinterest(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window.pintrk) return;

    const pinterestEvent = this.mapToPinterestEvent(event);
    window.pintrk('track', pinterestEvent, data);
  }

  /**
   * Track on Twitter Pixel
   */
  private trackTwitter(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window.twq) return;

    const twitterEvent = this.mapToTwitterEvent(event);
    window.twq('track', twitterEvent, data);
  }

  /**
   * Track on LinkedIn Insight Tag
   */
  private trackLinkedIn(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window._linkedin_data_partner_ids) return;

    const linkedInEvent = this.mapToLinkedInEvent(event);
    window.lintrk('track', { conversion_id: linkedInEvent });
  }

  /**
   * Track on Reddit Pixel
   */
  private trackReddit(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window.rdt) return;

    const redditEvent = this.mapToRedditEvent(event);
    window.rdt('track', redditEvent, data);
  }

  /**
   * Track on Microsoft/Bing UET
   */
  private trackMicrosoft(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window.uetq) return;

    const msEvent = this.mapToMicrosoftEvent(event);
    window.uetq.push('event', msEvent, data);
  }

  /**
   * Track on Mixpanel
   */
  private trackMixpanel(event: TrackingEvent, data?: TrackingEventData): void {
    if (typeof window === 'undefined' || !window.mixpanel) return;

    window.mixpanel.track(event, data);
  }

  /**
   * Send tracking data to server for storage and analysis
   * Note: শুধু sessionId ও deviceId পাঠাও — পুরো session history না
   */
  private async sendToServer(event: TrackingEvent, data?: TrackingEventData): Promise<void> {
    try {
      await fetch('/api/tracking/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data,
          sessionId: this.sessionData?.sessionId,
          deviceId: this.sessionData?.deviceId,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send tracking event to server:', error);
    }
  }

  /**
   * Event mapping functions
   */
  private mapToFacebookEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'PageView',
      ViewContent: 'ViewContent',
      Search: 'Search',
      AddToCart: 'AddToCart',
      ViewCart: 'ViewCart',
      AddToWishlist: 'AddToWishlist',
      InitiateCheckout: 'InitiateCheckout',
      AddShippingInfo: 'AddShippingInfo',
      AddPaymentInfo: 'AddPaymentInfo',
      Purchase: 'Purchase',
      Lead: 'Lead',
      CompleteRegistration: 'CompleteRegistration',
      Subscribe: 'Subscribe',
      StartTrial: 'StartTrial',
      SubmitApplication: 'SubmitApplication',
      Contact: 'Contact',
    };
    return mapping[event];
  }

  private mapToGoogleEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'page_view',
      ViewContent: 'view_item',
      Search: 'search',
      AddToCart: 'add_to_cart',
      ViewCart: 'view_cart',
      AddToWishlist: 'add_to_wishlist',
      InitiateCheckout: 'begin_checkout',
      AddShippingInfo: 'add_shipping_info',
      AddPaymentInfo: 'add_payment_info',
      Purchase: 'purchase',
      Lead: 'generate_lead',
      CompleteRegistration: 'sign_up',
      Subscribe: 'subscribe',
      StartTrial: 'start_trial',
      SubmitApplication: 'submit_application',
      Contact: 'contact',
    };
    return mapping[event];
  }

  private mapToTikTokEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'ViewContent',
      ViewContent: 'ViewContent',
      Search: 'Search',
      AddToCart: 'AddToCart',
      ViewCart: 'ViewCart',
      AddToWishlist: 'AddToWishlist',
      InitiateCheckout: 'InitiateCheckout',
      AddShippingInfo: 'AddShippingInfo',
      AddPaymentInfo: 'AddPaymentInfo',
      Purchase: 'Purchase',
      Lead: 'SubmitForm',
      CompleteRegistration: 'CompleteRegistration',
      Subscribe: 'Subscribe',
      StartTrial: 'StartTrial',
      SubmitApplication: 'SubmitForm',
      Contact: 'Contact',
    };
    return mapping[event];
  }

  private mapToSnapchatEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'PAGE_VIEW',
      ViewContent: 'VIEW_CONTENT',
      Search: 'SEARCH',
      AddToCart: 'ADD_CART',
      ViewCart: 'VIEW_CONTENT',
      AddToWishlist: 'ADD_TO_WISHLIST',
      InitiateCheckout: 'START_CHECKOUT',
      AddShippingInfo: 'ADD_BILLING',
      AddPaymentInfo: 'ADD_BILLING',
      Purchase: 'PURCHASE',
      Lead: 'SIGN_UP',
      CompleteRegistration: 'SIGN_UP',
      Subscribe: 'SUBSCRIBE',
      StartTrial: 'START_TRIAL',
      SubmitApplication: 'SUBMIT_APPLICATION',
      Contact: 'CONTACT',
    };
    return mapping[event];
  }

  private mapToPinterestEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'pagevisit',
      ViewContent: 'viewcategory',
      Search: 'search',
      AddToCart: 'addtocart',
      ViewCart: 'viewcategory',
      AddToWishlist: 'watchvideo',
      InitiateCheckout: 'checkout',
      AddShippingInfo: 'addpaymentinfo',
      AddPaymentInfo: 'addpaymentinfo',
      Purchase: 'checkout',
      Lead: 'lead',
      CompleteRegistration: 'signup',
      Subscribe: 'signup',
      StartTrial: 'watchvideo',
      SubmitApplication: 'lead',
      Contact: 'custom',
    };
    return mapping[event];
  }

  private mapToTwitterEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'PageView',
      ViewContent: 'ViewContent',
      Search: 'Search',
      AddToCart: 'AddToCart',
      ViewCart: 'ViewCart',
      AddToWishlist: 'AddToWishlist',
      InitiateCheckout: 'InitiateCheckout',
      AddShippingInfo: 'AddShippingInfo',
      AddPaymentInfo: 'AddPaymentInfo',
      Purchase: 'Purchase',
      Lead: 'tw-o8wu4-ofh3r',
      CompleteRegistration: 'tw-o8wu4-ofh3s',
      Subscribe: 'Subscribe',
      StartTrial: 'StartTrial',
      SubmitApplication: 'SubmitApplication',
      Contact: 'Contact',
    };
    return mapping[event];
  }

  private mapToLinkedInEvent(event: TrackingEvent): string {
    return '12345'; // Replace with actual conversion ID from LinkedIn
  }

  private mapToRedditEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'PageVisit',
      ViewContent: 'ViewContent',
      Search: 'Search',
      AddToCart: 'AddToCart',
      ViewCart: 'ViewContent',
      AddToWishlist: 'AddToWishlist',
      InitiateCheckout: 'Purchase',
      AddShippingInfo: 'AddPaymentInfo',
      AddPaymentInfo: 'AddPaymentInfo',
      Purchase: 'Purchase',
      Lead: 'Lead',
      CompleteRegistration: 'SignUp',
      Subscribe: 'SignUp',
      StartTrial: 'Custom',
      SubmitApplication: 'Lead',
      Contact: 'Custom',
    };
    return mapping[event];
  }

  private mapToMicrosoftEvent(event: TrackingEvent): string {
    const mapping: Record<TrackingEvent, string> = {
      PageView: 'page_view',
      ViewContent: 'view_item',
      Search: 'search',
      AddToCart: 'add_to_cart',
      ViewCart: 'view_cart',
      AddToWishlist: 'add_to_wishlist',
      InitiateCheckout: 'begin_checkout',
      AddShippingInfo: 'add_shipping_info',
      AddPaymentInfo: 'add_payment_info',
      Purchase: 'purchase',
      Lead: 'generate_lead',
      CompleteRegistration: 'sign_up',
      Subscribe: 'subscribe',
      StartTrial: 'start_trial',
      SubmitApplication: 'submit_application',
      Contact: 'contact',
    };
    return mapping[event];
  }

  /**
   * Utility functions
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return '';

    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('device_id', deviceId);
      // Register new device in DB (fire-and-forget)
      fetch('/api/tracking-device', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceId }),
      }).catch(() => {
        // Silently fail — localStorage still has the deviceId
      });
    }
    return deviceId;
  }

  /**
   * Restore UTM data from DB into localStorage
   * Call this on user login to recover cross-device UTM history
   */
  async restoreFromDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    const deviceId = localStorage.getItem('device_id');
    if (!deviceId) return;

    try {
      const res = await fetch(
        `/api/tracking-device?deviceId=${encodeURIComponent(deviceId)}`,
        { credentials: 'include' }
      );
      if (!res.ok) return;

      const { firstTouchUtm, lastTouchUtm } = await res.json();

      if (firstTouchUtm && !localStorage.getItem('first_touch_utm')) {
        localStorage.setItem('first_touch_utm', JSON.stringify(firstTouchUtm));
      }
      if (lastTouchUtm) {
        localStorage.setItem('last_touch_utm', JSON.stringify(lastTouchUtm));
      }
    } catch {
      // Silently fall back to localStorage
    }
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';

    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getOS(): string {
    if (typeof window === 'undefined') return 'Unknown';

    const ua = navigator.userAgent;
    if (ua.indexOf('Win') !== -1) return 'Windows';
    if (ua.indexOf('Mac') !== -1) return 'MacOS';
    if (ua.indexOf('Linux') !== -1) return 'Linux';
    if (ua.indexOf('Android') !== -1) return 'Android';
    if (ua.indexOf('iOS') !== -1) return 'iOS';
    return 'Unknown';
  }

  private getBrowser(): string {
    if (typeof window === 'undefined') return 'Unknown';

    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') !== -1) return 'Firefox';
    if (ua.indexOf('Chrome') !== -1) return 'Chrome';
    if (ua.indexOf('Safari') !== -1) return 'Safari';
    if (ua.indexOf('Edge') !== -1) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get current session data
   */
  getSession(): CustomerSession | null {
    return this.sessionData;
  }

  /**
   * Get platform configuration
   */
  getConfig(): AllPlatformsConfig {
    return this.config;
  }
}

// Export singleton instance
export const trackingManager = new TrackingManager();

// Convenience functions
export const track = (
  event: TrackingEvent,
  data?: TrackingEventData,
  options?: TrackingDispatchOptions
) => {
  trackingManager.track(event, data, options);
};

export const initTracking = () => {
  trackingManager.initSession();
};
