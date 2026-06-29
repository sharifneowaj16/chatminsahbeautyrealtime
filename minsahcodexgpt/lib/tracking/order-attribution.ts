import 'server-only';
import type { NextRequest } from 'next/server';
import { sanitizeTrackingPath, sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';

const TRACKING_SCHEMA_VERSION = 'mb_tracking_v1';

const ATTRIBUTION_COOKIE = 'mb_attribution';
const FIRST_LANDING_PATH_COOKIE = 'mb_first_landing_path';
const FIRST_LANDING_URL_COOKIE = 'mb_first_landing_url';
const REFERRER_COOKIE = 'mb_referrer';
const VISITOR_ID_COOKIE = 'mb_vid';

type AttributionCookie = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  placement?: string;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
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

export function readOrderAttribution(
  request: NextRequest,
  options: { userId?: string | null } = {}
) {
  const attribution = parseAttributionCookie(request);
  const visitorId = readCookie(request, VISITOR_ID_COOKIE);
  const externalId = options.userId
    ? `user:${options.userId}`
    : visitorId
      ? `visitor:${visitorId}`
      : undefined;

  return {
    fbp: readCookie(request, '_fbp'),
    fbc: readCookie(request, '_fbc'),
    externalId,
    anonymousVisitorId: visitorId,
    customerIp: getCustomerIp(request),
    customerUa: clean(request.headers.get('user-agent')),
    gaClientId: parseGaClientId(readCookie(request, '_ga')),
    gaSessionId: readGaSessionId(request),
    utmSource: clean(attribution.utm_source),
    utmMedium: clean(attribution.utm_medium),
    utmCampaign: clean(attribution.utm_campaign),
    utmContent: clean(attribution.utm_content),
    campaignId: clean(attribution.campaign_id),
    adsetId: clean(attribution.adset_id),
    adId: clean(attribution.ad_id),
    placement: clean(attribution.placement),
    firstLandingPath: sanitizeTrackingPath(readDecodedCookie(request, FIRST_LANDING_PATH_COOKIE)),
    firstLandingUrl: sanitizeTrackingUrl(readDecodedCookie(request, FIRST_LANDING_URL_COOKIE)),
    referrer: sanitizeTrackingUrl(readDecodedCookie(request, REFERRER_COOKIE)),
    trackingSchemaVersion: TRACKING_SCHEMA_VERSION,
  };
}
