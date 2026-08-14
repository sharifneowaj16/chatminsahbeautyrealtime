export const TIKTOK_CLICK_ID_COOKIE = 'ttclid';
export const TIKTOK_TTP_COOKIE = '_ttp';
export const DEFAULT_TIKTOK_CLICK_ID_MAX_AGE_DAYS = 90;
export const MAX_TIKTOK_CLICK_ID_MAX_AGE_DAYS = 365;
export const TIKTOK_ATTRIBUTION_VALUE_MAX_LENGTH = 500;

export function resolveTikTokClickIdMaxAgeDays(rawValue?: string | number | null) {
  const parsed = Number(rawValue ?? DEFAULT_TIKTOK_CLICK_ID_MAX_AGE_DAYS);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_TIKTOK_CLICK_ID_MAX_AGE_DAYS) {
    return DEFAULT_TIKTOK_CLICK_ID_MAX_AGE_DAYS;
  }

  return Math.floor(parsed);
}

export function resolveTikTokClickIdMaxAgeSeconds(rawValue?: string | number | null) {
  return resolveTikTokClickIdMaxAgeDays(rawValue) * 24 * 60 * 60;
}

export function cleanTikTokAttributionValue(
  value?: string | null,
  maxLength = TIKTOK_ATTRIBUTION_VALUE_MAX_LENGTH
) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}
