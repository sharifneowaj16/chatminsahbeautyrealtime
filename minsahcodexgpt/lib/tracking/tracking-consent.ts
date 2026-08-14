export const TRACKING_CONSENT_COOKIE = 'mb_tracking_consent';
export const TRACKING_CONSENT_VERSION_COOKIE = 'mb_tracking_consent_version';
export const CURRENT_TRACKING_CONSENT_VERSION = '2026-07-17';
export const TRACKING_CONSENT_EVENT = 'mb:tracking-consent-changed';
export const TRACKING_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const NON_ESSENTIAL_TRACKING_COOKIES = [
  'mb_vid',
  'mb_sid',
  '_fbc',
  '_fbp',
  'mb_attribution',
  'mb_first_landing_path',
  'mb_first_landing_url',
  'mb_referrer',
  'mb_last_non_gateway_referrer',
  'ttclid',
  '_ttp',
] as const;

export const NON_ESSENTIAL_TRACKING_STORAGE_KEYS = [
  'first_touch_attribution',
  'last_touch_attribution',
  'touchpoints',
  'first_touch_utm',
  'last_touch_utm',
  'device_id',
  'minsah_behavior',
] as const;

export type TrackingConsentState = 'granted' | 'denied' | 'withdrawn' | 'unknown';

/**
 * Non-essential analytics and advertising tracking is always opt-in.
 *
 * The legacy NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT flag is intentionally no
 * longer authoritative: a missing or incorrect deployment flag must never turn
 * an unknown consent state into implicit approval.
 */
export function isTrackingConsentRequired() {
  return true;
}

export function normalizeTrackingConsent(value: unknown): TrackingConsentState {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'granted') return 'granted';
  if (normalized === 'denied') return 'denied';
  if (normalized === 'withdrawn') return 'withdrawn';
  return 'unknown';
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getCookieDomainCandidates(): Array<string | undefined> {
  if (typeof window === 'undefined') return [undefined];

  const hostname = window.location.hostname.trim().toLowerCase();
  if (!hostname || hostname === 'localhost' || /^\d+(?:\.\d+){3}$/.test(hostname)) {
    return [undefined];
  }

  const labels = hostname.split('.').filter(Boolean);
  const candidates = new Set<string | undefined>([undefined, hostname, `.${hostname}`]);

  // Also attempt parent-domain deletion for cookies created by third-party tags
  // using a leading-dot domain (for example .minsahbeauty.cloud).
  for (let index = 1; index < labels.length - 1; index += 1) {
    const parent = labels.slice(index).join('.');
    candidates.add(parent);
    candidates.add(`.${parent}`);
  }

  return [...candidates];
}

function expireCookie(name: string) {
  if (typeof document === 'undefined') return;

  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? ';Secure'
    : '';

  for (const domain of getCookieDomainCandidates()) {
    const domainAttribute = domain ? `;domain=${domain}` : '';
    document.cookie = `${name}=;Max-Age=0;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax${secure}${domainAttribute}`;
  }
}

export function clearNonEssentialTrackingStorage() {
  if (typeof window === 'undefined') return;

  for (const cookieName of NON_ESSENTIAL_TRACKING_COOKIES) {
    expireCookie(cookieName);
  }

  try {
    for (const key of NON_ESSENTIAL_TRACKING_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable in hardened/private browser contexts.
  }
}

export function getClientTrackingConsent(): TrackingConsentState {
  return normalizeTrackingConsent(readCookie(TRACKING_CONSENT_COOKIE));
}

export function getClientTrackingConsentVersion() {
  return readCookie(TRACKING_CONSENT_VERSION_COOKIE)?.trim() || null;
}

export function canLoadNonEssentialTracking(
  consent = getClientTrackingConsent(),
  consentVersion?: string | null
) {
  if (consent !== 'granted') return false;
  return consentVersion === undefined || Boolean(consentVersion?.trim());
}

export function syncClientTrackingConsentSignals(
  consent: Exclude<TrackingConsentState, 'unknown' | 'withdrawn'>
) {
  if (typeof window === 'undefined') return;

  const modeValue = consent === 'granted' ? 'granted' : 'denied';
  const trackingWindow = window as Window & {
    __mbTrackingConsent?: 'granted' | 'denied';
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  };

  trackingWindow.__mbTrackingConsent = modeValue;

  if (typeof trackingWindow.gtag === 'function') {
    trackingWindow.gtag('consent', 'update', {
      ad_storage: modeValue,
      analytics_storage: modeValue,
      ad_user_data: modeValue,
      ad_personalization: modeValue,
    });
  }

  if (typeof trackingWindow.fbq === 'function') {
    trackingWindow.fbq('consent', consent === 'granted' ? 'grant' : 'revoke');
  }
}

export function setClientTrackingConsent(consent: Exclude<TrackingConsentState, 'unknown' | 'withdrawn'>) {
  if (typeof document === 'undefined') return;

  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? ';Secure'
    : '';
  document.cookie = `${TRACKING_CONSENT_COOKIE}=${encodeURIComponent(consent)};max-age=${TRACKING_CONSENT_MAX_AGE_SECONDS};path=/;SameSite=Lax${secure}`;
  document.cookie = `${TRACKING_CONSENT_VERSION_COOKIE}=${encodeURIComponent(CURRENT_TRACKING_CONSENT_VERSION)};max-age=${TRACKING_CONSENT_MAX_AGE_SECONDS};path=/;SameSite=Lax${secure}`;

  syncClientTrackingConsentSignals(consent);

  if (consent === 'denied') {
    clearNonEssentialTrackingStorage();
  }

  window.dispatchEvent(new CustomEvent(TRACKING_CONSENT_EVENT, { detail: { consent } }));
}

export function getServerTrackingConsentFromCookie(value: string | undefined | null) {
  return normalizeTrackingConsent(value);
}

export function getServerTrackingConsentVersionFromCookie(value: string | undefined | null) {
  return value?.trim() || null;
}

export function isConsentDenied(consent: TrackingConsentState) {
  return consent === 'denied' || consent === 'withdrawn';
}
