/**
 * Safe Image URL Sanitizer
 * 
 * Ensures any image source passed to Next.js `<Image>` or `<img>`
 * is a valid non-empty string, preventing:
 * - "An empty string ("") was passed to the src attribute"
 * - "Image is missing required "src" property: {}"
 */

export const DEFAULT_SKINCARE_PLACEHOLDER = '/images/categories/Skincare.png';

export function safeImageUrl(
  img: unknown,
  fallback: string = DEFAULT_SKINCARE_PLACEHOLDER
): string {
  if (!img) return fallback;

  if (typeof img === 'string') {
    const trimmed = img.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (typeof img === 'object' && img !== null) {
    const record = img as Record<string, unknown>;
    if (typeof record.src === 'string' && record.src.trim().length > 0) {
      return record.src.trim();
    }
    if (typeof record.url === 'string' && record.url.trim().length > 0) {
      return record.url.trim();
    }
    if (typeof record.image === 'string' && record.image.trim().length > 0) {
      return record.image.trim();
    }
    if (typeof record.thumbnail === 'string' && record.thumbnail.trim().length > 0) {
      return record.thumbnail.trim();
    }
  }

  return fallback;
}
