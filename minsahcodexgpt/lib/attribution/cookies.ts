export const ATTRIBUTION_SESSION_COOKIE = 'mb_sid';
export const ATTRIBUTION_VISITOR_COOKIE = 'mb_vid';
export const ATTRIBUTION_COOKIE = 'mb_attribution';
export const ATTRIBUTION_SESSION_MAX_AGE_SECONDS = 30 * 60;

export function getBrowserCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

export function ensureAttributionSessionId() {
  if (typeof document === 'undefined') return undefined;
  const existing = getBrowserCookie(ATTRIBUTION_SESSION_COOKIE)?.trim();
  const value = existing || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `sid_${crypto.randomUUID()}`
    : `sid_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${ATTRIBUTION_SESSION_COOKIE}=${encodeURIComponent(value)};max-age=${ATTRIBUTION_SESSION_MAX_AGE_SECONDS};path=/;SameSite=Lax${secure}`;
  return value;
}
