'use client';

import { useEffect } from 'react';
import { normalizeMetaExternalIdValue } from '@/lib/tracking/meta-external-id';
import { isPaymentGatewayReferralUrl, isPaymentReturnPath } from '@/lib/tracking/payment-gateway-referrals';

const VISITOR_COOKIE = 'mb_vid';
const ATTRIBUTION_COOKIE = 'mb_attribution';
const FIRST_LANDING_PATH_COOKIE = 'mb_first_landing_path';
const FIRST_LANDING_URL_COOKIE = 'mb_first_landing_url';
const REFERRER_COOKIE = 'mb_referrer';
const LAST_NON_GATEWAY_REFERRER_COOKIE = 'mb_last_non_gateway_referrer';

const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days
const FBC_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'campaign_id',
  'adset_id',
  'ad_id',
  'placement',
] as const;

const SENSITIVE_URL_PARAMS = [
  'bpt',
  'token',
  'access_token',
  'signature',
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

  document.cookie = `${name}=${encodeURIComponent(value)};max-age=${maxAgeSeconds};path=/;SameSite=Lax`;
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

function captureFbcFromFbclid(searchParams: URLSearchParams) {
  const fbclid = searchParams.get('fbclid')?.trim();
  if (!fbclid) return;

  // Keep an existing _fbc so a later page view does not overwrite the original ad click.
  if (getCookieValue('_fbc')) return;

  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  setCookie('_fbc', fbc, FBC_MAX_AGE_SECONDS);
}

function captureAttribution(searchParams: URLSearchParams) {
  const attribution = ATTRIBUTION_PARAMS.reduce<Record<AttributionParam, string | undefined>>(
    (acc, param) => {
      const value = searchParams.get(param)?.trim();
      if (value) acc[param] = value;
      return acc;
    },
    {} as Record<AttributionParam, string | undefined>
  );

  if (Object.values(attribution).some(Boolean)) {
    setCookie(ATTRIBUTION_COOKIE, JSON.stringify(attribution), ATTRIBUTION_MAX_AGE_SECONDS);
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
 * - mb_attribution: UTM/ad ids stored as first-party cookie, not localStorage-only
 * - landing/referrer cookies used by readOrderAttribution()
 * Payment gateway referrers are intentionally ignored so GA4 attribution is not overwritten.
 */
export default function AttributionCookieCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    ensureVisitorId();
    const searchParams = new URLSearchParams(window.location.search);
    captureFbcFromFbclid(searchParams);
    captureAttribution(searchParams);
    captureFirstLandingAndReferrer();
  }, []);

  return null;
}
