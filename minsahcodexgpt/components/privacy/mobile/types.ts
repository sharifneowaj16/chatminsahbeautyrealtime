export interface CookiePreferences {
  necessary: boolean; // Always true
  logistics: boolean;
  regimen: boolean;
  ads: boolean;
}

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  logistics: true,
  regimen: true,
  ads: false,
};
