export const TRACKING_CONSENT_COOKIE = 'mb_tracking_consent';
export const TRACKING_CONSENT_EVENT = 'mb:tracking-consent-changed';
export const TRACKING_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type TrackingConsentState = 'granted' | 'denied' | 'unknown';

export function isTrackingConsentRequired() {
  return process.env.NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT === 'true';
}

export function normalizeTrackingConsent(value: unknown): TrackingConsentState {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'granted') return 'granted';
  if (normalized === 'denied') return 'denied';
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

export function getClientTrackingConsent(): TrackingConsentState {
  return normalizeTrackingConsent(readCookie(TRACKING_CONSENT_COOKIE));
}

export function canLoadNonEssentialTracking(consent = getClientTrackingConsent()) {
  if (consent === 'denied') return false;
  if (isTrackingConsentRequired()) return consent === 'granted';
  return true;
}

export function setClientTrackingConsent(consent: Exclude<TrackingConsentState, 'unknown'>) {
  if (typeof document === 'undefined') return;

  document.cookie = `${TRACKING_CONSENT_COOKIE}=${encodeURIComponent(consent)};max-age=${TRACKING_CONSENT_MAX_AGE_SECONDS};path=/;SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(TRACKING_CONSENT_EVENT, { detail: { consent } }));
}

export function getServerTrackingConsentFromCookie(value: string | undefined | null) {
  return normalizeTrackingConsent(value);
}

export function isConsentDenied(consent: TrackingConsentState) {
  return consent === 'denied';
}
