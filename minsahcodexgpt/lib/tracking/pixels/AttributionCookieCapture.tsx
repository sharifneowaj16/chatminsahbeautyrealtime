'use client';

import { useEffect } from 'react';
import { normalizeMetaExternalIdValue } from '@/lib/tracking/meta-external-id';
import { isPaymentGatewayReferralUrl, isPaymentReturnPath } from '@/lib/tracking/payment-gateway-referrals';
import { canLoadNonEssentialTracking, getClientTrackingConsent } from '@/lib/tracking/tracking-consent';
import { ensureAttributionSessionId } from '@/lib/attribution/cookies';
import {
  cleanTikTokAttributionValue,
  resolveTikTokClickIdMaxAgeSeconds,
  TIKTOK_CLICK_ID_COOKIE,
} from '@/lib/tracking/tiktok-attribution';

const VISITOR_COOKIE = 'mb_vid';
const ATTRIBUTION_COOKIE = 'mb_attribution';
const FIRST_LANDING_PATH_COOKIE = 'mb_first_landing_path';
const FIRST_LANDING_URL_COOKIE = 'mb_first_landing_url';
const REFERRER_COOKIE = 'mb_referrer';
const LAST_NON_GATEWAY_REFERRER_COOKIE = 'mb_last_non_gateway_referrer';

const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days
const FBC_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const TIKTOK_CLICK_ID_MAX_AGE_SECONDS = resolveTikTokClickIdMaxAgeSeconds(
  process.env.NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS
);

const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'campaign_id',
  'adset_id',
  'ad_id',
  'placement',
  'offer_version',
  'ab_variant',
  'coupon_code',
  'free_delivery_threshold',
  'landing_offer',
  'campaign_source_url',
] as const;

const SENSITIVE_URL_PARAMS = [
  'bpt',
  'token',
  'access_token',
  'signature',
  'sig',
  'email',
  'phone',
  'mobile',
  'msisdn',
  'secret',
  'auth',
  'session',
  'nonce',
];

type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

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

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  if (!canLoadNonEssentialTracking(getClientTrackingConsent())) return;

  const secure = window.location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAgeSeconds};path=/;SameSite=Lax${secure}`;
}

function ensureVisitorId() {
  const existing = normalizeMetaExternalIdValue(getCookieValue(VISITOR_COOKIE));
  if (existing) {
    // Normalize legacy mixed-case/whitespace cookies so browser and server hash the same source.
    setCookie(VISITOR_COOKIE, existing, VISITOR_MAX_AGE_SECONDS);
    return existing;
  }

  const generated = normalizeMetaExternalIdValue(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `vid_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  if (!generated) return undefined;
  setCookie(VISITOR_COOKIE, generated, VISITOR_MAX_AGE_SECONDS);
  return generated;
}

function sanitizeUrl(rawUrl: string | undefined) {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl, window.location.origin);
    for (const param of SENSITIVE_URL_PARAMS) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function sanitizePath() {
  try {
    const url = new URL(window.location.href);
    for (const param of SENSITIVE_URL_PARAMS) {
      url.searchParams.delete(param);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return window.location.pathname;
  }
}


function captureTikTokClickId(searchParams: URLSearchParams) {
  if (!canLoadNonEssentialTracking(getClientTrackingConsent())) return;

  const ttclid = cleanTikTokAttributionValue(searchParams.get('ttclid'));
  if (!ttclid) return;

  // Keep an existing TikTok Click ID so later page views or payment returns do not overwrite
  // the original ad click attribution used by the future Events API Purchase pipeline.
  if (getCookieValue(TIKTOK_CLICK_ID_COOKIE)) return;

  setCookie(TIKTOK_CLICK_ID_COOKIE, ttclid, TIKTOK_CLICK_ID_MAX_AGE_SECONDS);
}

function captureFbcFromFbclid(searchParams: URLSearchParams) {
  if (!canLoadNonEssentialTracking(getClientTrackingConsent())) return;

  const fbclid = searchParams.get('fbclid')?.trim();
  if (!fbclid) return;

  // Keep an existing _fbc so a later page view does not overwrite the original ad click.
  if (getCookieValue('_fbc')) return;

  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  setCookie('_fbc', fbc, FBC_MAX_AGE_SECONDS);
}

function normalizeAttributionValue(param: AttributionParam, value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (param === 'campaign_source_url') {
    return sanitizeUrl(trimmed);
  }

  // Keep first-party attribution compact and safe for cookies/DB/event params.
  return trimmed.slice(0, 300);
}

function captureAttribution(searchParams: URLSearchParams) {
  const attribution = ATTRIBUTION_PARAMS.reduce<Record<AttributionParam, string | undefined>>(
    (acc, param) => {
      const value = normalizeAttributionValue(param, searchParams.get(param));
      if (value) acc[param] = value;
      return acc;
    },
    {} as Record<AttributionParam, string | undefined>
  );

  if (Object.values(attribution).some(Boolean)) {
    // If no explicit campaign_source_url param is supplied, preserve the safe landing URL
    // that produced the campaign/offer attribution. Payment return URLs are skipped by caller.
    attribution.campaign_source_url =
      attribution.campaign_source_url ?? sanitizeUrl(window.location.href);
    setCookie(ATTRIBUTION_COOKIE, JSON.stringify(attribution), ATTRIBUTION_MAX_AGE_SECONDS);
  }
}

async function syncFirstPartyAttribution(searchParams: URLSearchParams, visitorId?: string) {
  const sessionId = ensureAttributionSessionId();
  if (!sessionId && !visitorId) return;
  let stored: Record<string, string> = {};
  const raw = getCookieValue(ATTRIBUTION_COOKIE);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed as Record<string, string>;
    } catch {
      stored = {};
    }
  }
  const value = (name: string) => searchParams.get(name)?.trim() || stored[name];
  try {
    await fetch('/api/attribution/capture', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        sessionId,
        visitorId,
        landingPage: sanitizeUrl(window.location.href),
        utm: {
          source: value('utm_source'), medium: value('utm_medium'), campaign: value('utm_campaign'),
          term: value('utm_term'), content: value('utm_content'),
        },
        fbclid: searchParams.get('fbclid')?.trim() || undefined,
        fbp: getCookieValue('_fbp'),
        fbc: getCookieValue('_fbc'),
        capturedAt: new Date().toISOString(),
      }),
    });
  } catch {
    // Cookie snapshot remains available to checkout even when the capture API is unavailable.
  }
}

function isSameOriginUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).origin === window.location.origin;
  } catch {
    return false;
  }
}

function captureFirstLandingAndReferrer() {
  const paymentReturn = isPaymentReturnPath(window.location.pathname);

  if (!getCookieValue(FIRST_LANDING_PATH_COOKIE) && !paymentReturn) {
    setCookie(FIRST_LANDING_PATH_COOKIE, sanitizePath(), ATTRIBUTION_MAX_AGE_SECONDS);
  }

  if (!getCookieValue(FIRST_LANDING_URL_COOKIE) && !paymentReturn) {
    const safeCurrentUrl = sanitizeUrl(window.location.href);
    if (safeCurrentUrl) {
      setCookie(FIRST_LANDING_URL_COOKIE, safeCurrentUrl, ATTRIBUTION_MAX_AGE_SECONDS);
    }
  }

  const safeReferrer = sanitizeUrl(document.referrer);
  if (!safeReferrer || isSameOriginUrl(safeReferrer)) return;

  // Payment gateway return referrers must never become first-touch/last-touch attribution.
  // GA4 source/medium should stay with the original ad/session, not bkash/nagad/etc.
  if (isPaymentGatewayReferralUrl(safeReferrer)) return;

  setCookie(LAST_NON_GATEWAY_REFERRER_COOKIE, safeReferrer, ATTRIBUTION_MAX_AGE_SECONDS);

  if (!getCookieValue(REFERRER_COOKIE)) {
    setCookie(REFERRER_COOKIE, safeReferrer, ATTRIBUTION_MAX_AGE_SECONDS);
  }
}

/**
 * Captures first-party tracking cookies required before checkout/order creation:
 * - mb_vid: stable anonymous visitor ID
 * - _fbc: generated from fbclid for Meta ad-click attribution
 * - ttclid: TikTok Click ID captured with configurable retention for future Events API matching
 * - mb_attribution: UTM/ad ids stored as first-party cookie, not localStorage-only
 * - landing/referrer cookies used by readOrderAttribution()
 * Payment gateway referrers are intentionally ignored so GA4 attribution is not overwritten.
 */
export default function AttributionCookieCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!canLoadNonEssentialTracking(getClientTrackingConsent())) return;

    const visitorId = ensureVisitorId();
    const searchParams = new URLSearchParams(window.location.search);
    const paymentReturn = isPaymentReturnPath(window.location.pathname);

    captureTikTokClickId(searchParams);
    captureFbcFromFbclid(searchParams);

    // Payment gateways sometimes append their own query/referrer values on return.
    // Never let those overwrite the original ad/offer attribution cookie.
    if (!paymentReturn) {
      captureAttribution(searchParams);
    }

    captureFirstLandingAndReferrer();
    if (!paymentReturn) void syncFirstPartyAttribution(searchParams, visitorId);
  }, []);

  return null;
}
