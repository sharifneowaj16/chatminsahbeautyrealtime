import 'server-only';
import type { NextRequest } from 'next/server';
import { sanitizeTrackingPath, sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';
import { isPaymentGatewayReferralUrl } from '@/lib/tracking/payment-gateway-referrals';
import { chooseCanonicalMetaExternalId, normalizeMetaExternalIdValue } from '@/lib/tracking/meta-external-id';
import {
  getServerTrackingConsentFromCookie,
  getServerTrackingConsentVersionFromCookie,
  TRACKING_CONSENT_VERSION_COOKIE,
  isConsentDenied,
  TRACKING_CONSENT_COOKIE,
} from '@/lib/tracking/tracking-consent';
import { resolveTrackingDecision } from '@/lib/privacy/consent-resolver';
import { TRACKING_SCHEMA_VERSION } from '@/lib/tracking/meta-schema';
import {
  cleanTikTokAttributionValue,
  TIKTOK_CLICK_ID_COOKIE,
  TIKTOK_TTP_COOKIE,
} from '@/lib/tracking/tiktok-attribution';

const ATTRIBUTION_COOKIE = 'mb_attribution';
const FIRST_LANDING_PATH_COOKIE = 'mb_first_landing_path';
const FIRST_LANDING_URL_COOKIE = 'mb_first_landing_url';
const REFERRER_COOKIE = 'mb_referrer';
const VISITOR_ID_COOKIE = 'mb_vid';

const MAX_ATTRIBUTION_VALUE_LENGTH = 300;

type AttributionCookie = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  placement?: string;
  offer_version?: string;
  ab_variant?: string;
  coupon_code?: string;
  free_delivery_threshold?: string;
  landing_offer?: string;
  campaign_source_url?: string;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function cleanAttributionValue(value?: string | null, maxLength = MAX_ATTRIBUTION_VALUE_LENGTH) {
  const trimmed = clean(value);
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function parsePositiveAmount(value?: string | null) {
  const trimmed = clean(value);
  if (!trimmed) return undefined;

  const normalized = trimmed.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return Number(amount.toFixed(2));
}

function readCookie(request: NextRequest, name: string) {
  return clean(request.cookies.get(name)?.value);
}

function readDecodedCookie(request: NextRequest, name: string) {
  let value = readCookie(request, name);
  if (!value) return undefined;

  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }

  return value;
}

function parseAttributionCookie(request: NextRequest): AttributionCookie {
  const value = readDecodedCookie(request, ATTRIBUTION_COOKIE);
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as AttributionCookie;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function getFirstForwardedIp(value?: string | null) {
  return clean(value?.split(',')[0]);
}

export function getCustomerIp(request: NextRequest) {
  return (
    getFirstForwardedIp(request.headers.get('x-forwarded-for')) ??
    clean(request.headers.get('cf-connecting-ip')) ??
    clean(request.headers.get('true-client-ip')) ??
    clean(request.headers.get('x-real-ip'))
  );
}

function parseGaClientId(gaCookie?: string) {
  if (!gaCookie) return undefined;
  const parts = gaCookie.split('.');
  if (parts.length >= 4) {
    return parts.slice(-2).join('.');
  }
  return clean(gaCookie);
}

function parseGaSessionId(value?: string) {
  if (!value) return undefined;
  const parts = value.split('.');
  const sessionPart = parts.find((part) => /^s\d+$/.test(part));
  if (sessionPart) return sessionPart.slice(1);
  if (parts.length >= 3 && /^\d+$/.test(parts[2])) return parts[2];
  return undefined;
}

function readGaSessionId(request: NextRequest) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('_ga_')) {
      const sessionId = parseGaSessionId(cookie.value);
      if (sessionId) return sessionId;
    }
  }

  return undefined;
}

function sanitizeNonGatewayReferrer(value?: string) {
  const sanitized = sanitizeTrackingUrl(value);
  if (!sanitized) return undefined;
  return isPaymentGatewayReferralUrl(sanitized) ? undefined : sanitized;
}

function sanitizeNonGatewayCampaignSourceUrl(value?: string | null) {
  const sanitized = sanitizeTrackingUrl(value);
  if (!sanitized) return undefined;
  return isPaymentGatewayReferralUrl(sanitized) ? undefined : sanitized;
}

export function readOrderAttribution(
  request: NextRequest,
  options: { userId?: string | null } = {}
) {
  const trackingConsent = getServerTrackingConsentFromCookie(
    readCookie(request, TRACKING_CONSENT_COOKIE)
  );
  const trackingConsentVersion = getServerTrackingConsentVersionFromCookie(
    readCookie(request, TRACKING_CONSENT_VERSION_COOKIE)
  );
  const trackingDecision = resolveTrackingDecision({
    consentState: trackingConsent,
    consentVersion: trackingConsentVersion,
    eventCategory: 'ADVERTISING',
  });
  const nonEssentialTrackingAllowed = trackingDecision.allowCapiEvent;
  const attribution = nonEssentialTrackingAllowed ? parseAttributionCookie(request) : {};
  const visitorId = nonEssentialTrackingAllowed
    ? normalizeMetaExternalIdValue(readCookie(request, VISITOR_ID_COOKIE))
    : undefined;
  const externalId = nonEssentialTrackingAllowed
    ? chooseCanonicalMetaExternalId({
        visitorId,
        userId: options.userId,
      })
    : undefined;
  const firstLandingUrl = nonEssentialTrackingAllowed
    ? sanitizeTrackingUrl(readDecodedCookie(request, FIRST_LANDING_URL_COOKIE))
    : undefined;
  const campaignSourceUrl = nonEssentialTrackingAllowed
    ? sanitizeNonGatewayCampaignSourceUrl(attribution.campaign_source_url) ?? firstLandingUrl
    : undefined;

  return {
    fbp: nonEssentialTrackingAllowed ? readCookie(request, '_fbp') : undefined,
    fbc: nonEssentialTrackingAllowed ? readCookie(request, '_fbc') : undefined,
    externalId,
    anonymousVisitorId: visitorId,
    tiktokClickId: nonEssentialTrackingAllowed
      ? cleanTikTokAttributionValue(readDecodedCookie(request, TIKTOK_CLICK_ID_COOKIE))
      : undefined,
    tiktokTtp: nonEssentialTrackingAllowed
      ? cleanTikTokAttributionValue(readDecodedCookie(request, TIKTOK_TTP_COOKIE))
      : undefined,
    tiktokExternalId: nonEssentialTrackingAllowed ? externalId : undefined,
    // IP and user agent remain available for essential security/fraud controls.
    // Downstream advertising dispatch is blocked by nonEssentialTrackingAllowed.
    customerIp: getCustomerIp(request),
    customerUa: clean(request.headers.get('user-agent')),
    gaClientId: nonEssentialTrackingAllowed
      ? parseGaClientId(readCookie(request, '_ga'))
      : undefined,
    gaSessionId: nonEssentialTrackingAllowed ? readGaSessionId(request) : undefined,
    utmSource: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.utm_source)
      : undefined,
    utmMedium: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.utm_medium)
      : undefined,
    utmCampaign: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.utm_campaign)
      : undefined,
    utmContent: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.utm_content)
      : undefined,
    utmTerm: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.utm_term)
      : undefined,
    campaignId: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.campaign_id)
      : undefined,
    adsetId: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.adset_id)
      : undefined,
    adId: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.ad_id)
      : undefined,
    placement: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.placement)
      : undefined,
    offerVersion: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.offer_version)
      : undefined,
    abVariant: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.ab_variant)
      : undefined,
    attributionCouponCode: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.coupon_code, 100)
      : undefined,
    freeDeliveryThreshold: nonEssentialTrackingAllowed
      ? parsePositiveAmount(attribution.free_delivery_threshold)
      : undefined,
    landingOffer: nonEssentialTrackingAllowed
      ? cleanAttributionValue(attribution.landing_offer)
      : undefined,
    campaignSourceUrl,
    firstLandingPath: nonEssentialTrackingAllowed
      ? sanitizeTrackingPath(readDecodedCookie(request, FIRST_LANDING_PATH_COOKIE))
      : undefined,
    firstLandingUrl,
    referrer: nonEssentialTrackingAllowed
      ? sanitizeNonGatewayReferrer(readDecodedCookie(request, REFERRER_COOKIE))
      : undefined,
    trackingConsent,
    trackingConsentVersion,
    trackingPolicyReason: trackingDecision.reason,
    nonEssentialTrackingAllowed,
    trackingFilteredReason: nonEssentialTrackingAllowed
      ? undefined
      : isConsentDenied(trackingConsent)
        ? 'CONSENT_DENIED'
        : 'CONSENT_NOT_GRANTED',
    trackingSchemaVersion: TRACKING_SCHEMA_VERSION,
  };
}
