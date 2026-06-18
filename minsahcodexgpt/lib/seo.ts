// lib/seo.ts
export const DEFAULT_SITE_URL = 'https://minsahbeauty.cloud';

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    DEFAULT_SITE_URL
  ).replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const siteUrl = getSiteUrl();
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isSameSiteUrl(url: string): boolean {
  const siteUrl = getSiteUrl();
  return url === siteUrl || url.startsWith(`${siteUrl}/`);
}

export function safeCanonicalUrl(pathOrUrl: string | null | undefined, fallbackPath: string): string {
  const raw = pathOrUrl?.trim();
  if (!raw || raw.includes('ADD_FINAL_PRODUCT_PAGE_URL')) return absoluteUrl(fallbackPath);
  if (raw.startsWith('/')) return absoluteUrl(raw);
  if (/^https?:\/\//i.test(raw) && isSameSiteUrl(raw)) return raw;
  return absoluteUrl(fallbackPath);
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function shouldIndexFromSitemapPayload(value: unknown): boolean {
  const payload = parseJsonObject(value);
  if (!payload) return true;

  if (payload.includeInSitemap === false) return false;
  if (payload.sitemap === false) return false;
  if (payload.index === false) return false;
  if (payload.noindex === true) return false;

  const robots = typeof payload.robots === 'string' ? payload.robots.toLowerCase() : '';
  if (robots.includes('noindex')) return false;

  return true;
}
