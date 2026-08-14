import { sanitizeTrackingUrl } from '@/lib/tracking/sanitize-url';
import { buildAttributionKey, normalizeAttributionIdentity } from './session';
import type { AttributionCaptureInput, AttributionTouch, NormalizedAttributionCapture } from './types';

const MAX_CAPTURE_AGE_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1_000;
const SAFE_CLICK_ID = /^[A-Za-z0-9._:-]{1,500}$/;
const SAFE_META_COOKIE = /^fb\.1\.\d{10,16}\.[A-Za-z0-9._:-]{1,256}$/;

function clean(value: unknown, max = 150) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, max) : undefined;
}

function normalizeDimension(value: unknown, fallback: string, lowercase = false) {
  const normalized = clean(value);
  return normalized ? (lowercase ? normalized.toLowerCase() : normalized) : fallback;
}

function normalizeClickId(value: unknown) {
  const normalized = clean(value, 500);
  return normalized && SAFE_CLICK_ID.test(normalized) ? normalized : undefined;
}

function normalizeMetaCookie(value: unknown) {
  const normalized = clean(value, 300);
  return normalized && SAFE_META_COOKIE.test(normalized) ? normalized : undefined;
}

function normalizeCapturedAt(value: unknown, now = new Date()) {
  const parsed = value ? new Date(String(value)) : now;
  if (Number.isNaN(parsed.getTime())) throw new Error('ATTRIBUTION_CAPTURED_AT_INVALID');
  if (parsed.getTime() < now.getTime() - MAX_CAPTURE_AGE_MS) throw new Error('ATTRIBUTION_CAPTURE_TOO_OLD');
  if (parsed.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) throw new Error('ATTRIBUTION_CAPTURE_IN_FUTURE');
  return parsed;
}

export function hasEligibleMarketingSignal(input: { utmSource?: string; utmMedium?: string; utmCampaign?: string; fbclid?: string; fbc?: string }) {
  return Boolean(input.fbclid || input.fbc || input.utmCampaign || (input.utmSource && input.utmSource !== 'direct') || (input.utmMedium && input.utmMedium !== 'none'));
}

export function buildAttributionCapture(input: AttributionCaptureInput, now = new Date()): NormalizedAttributionCapture {
  const sessionId = normalizeAttributionIdentity(input.sessionId);
  const visitorId = normalizeAttributionIdentity(input.visitorId);
  const customerId = normalizeAttributionIdentity(input.customerId);
  const capturedAt = normalizeCapturedAt(input.capturedAt, now);
  const landingPage = sanitizeTrackingUrl(clean(input.landingPage, 2_000));
  const fbclid = normalizeClickId(input.fbclid);
  const fbc = normalizeMetaCookie(input.fbc);
  const fbp = normalizeMetaCookie(input.fbp);
  const utmSource = normalizeDimension(input.utm?.source, 'direct', true);
  const utmMedium = normalizeDimension(input.utm?.medium, 'none', true);
  const utmCampaign = normalizeDimension(input.utm?.campaign, 'unattributed');
  const utmTerm = clean(input.utm?.term);
  const utmContent = clean(input.utm?.content);
  const direct = !hasEligibleMarketingSignal({ utmSource, utmMedium, utmCampaign: utmCampaign === 'unattributed' ? undefined : utmCampaign, fbclid, fbc });
  const touch: AttributionTouch = {
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign,
    ...(utmTerm && { term: utmTerm }),
    ...(utmContent && { content: utmContent }),
    ...(landingPage && { landingPage }),
    ...(fbclid && { fbclid }),
    ...(fbc && { fbc }),
    ...(fbp && { fbp }),
    capturedAt: capturedAt.toISOString(),
    direct,
  };
  return {
    attributionKey: buildAttributionKey({ sessionId, visitorId }),
    sessionId, visitorId, customerId, fbclid, fbc, fbp,
    utmSource: direct ? undefined : utmSource,
    utmMedium: direct ? undefined : utmMedium,
    utmCampaign: direct ? undefined : utmCampaign,
    utmTerm, utmContent, landingPage, capturedAt,
    consentState: clean(input.consentState, 32)?.toUpperCase() || 'UNKNOWN',
    touch,
  };
}
