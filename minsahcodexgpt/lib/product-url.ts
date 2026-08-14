// lib/product-url.ts
// Centralized product URL helpers.
// Public navigation should use slug-first URLs, while cart/order/tracking
// should continue using the stable database product id.

export type ProductUrlInput = {
  id: string;
  slug?: string | null;
  urlSlug?: string | null;
};

function cleanProductUrlKey(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  // Be defensive if a caller accidentally passes a path instead of a bare slug.
  const withoutProductPrefix = trimmed.replace(/^\/?products\//i, '');
  return withoutProductPrefix.replace(/^\/+|\/+$/g, '');
}

export function productUrlKey(product: ProductUrlInput): string {
  return (
    cleanProductUrlKey(product.slug) ||
    cleanProductUrlKey(product.urlSlug) ||
    cleanProductUrlKey(product.id)
  );
}

export function productPath(product: ProductUrlInput): string {
  const key = productUrlKey(product);
  return `/products/${encodeURIComponent(key)}`;
}
