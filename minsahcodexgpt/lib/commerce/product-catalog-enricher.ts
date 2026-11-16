const DEFAULT_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://minsahbeauty.cloud'
).replace(/\/$/, '');

export const DEFAULT_CATALOG_FALLBACK_IMAGE = `${DEFAULT_SITE_URL}/images/categories/Skincare.png`;

export function sanitizeSkuSegment(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function normalizeCatalogSalePrice(
  regularPrice: unknown,
  salePrice: unknown
): string | null {
  if (salePrice === null || salePrice === undefined || salePrice === '') {
    return null;
  }
  const regular = Number(String(regularPrice ?? '').replace(/,/g, '').trim());
  const saleText = String(salePrice).replace(/,/g, '').trim();
  const sale = Number(saleText);

  if (!Number.isFinite(regular) || !Number.isFinite(sale) || regular <= 0 || sale <= 0 || sale >= regular) {
    return null;
  }
  return saleText;
}

export function ensureCanonicalProductSku(input: {
  id?: string | null;
  sku?: string | null;
  slug?: string | null;
  name?: string | null;
}): string {
  const raw = input.sku?.trim();
  if (raw && !/^c[a-z0-9]{20,}$/i.test(raw)) {
    return raw;
  }
  const base = sanitizeSkuSegment(input.slug || input.name || 'PRODUCT');
  const suffix = input.id ? input.id.slice(-6).toUpperCase() : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MB-${base.slice(0, 18)}-${suffix}`;
}

export function ensureCanonicalVariantSkus<
  T extends { id?: string; sku?: string | null; name?: string | null }
>(
  productSku: string,
  variants: T[],
  existingSkuByVariantId?: ReadonlyMap<string, string>
): Array<T & { sku: string }> {
  const seen = new Set<string>([productSku.toUpperCase()]);
  return variants.map((variant, idx) => {
    const raw = variant.sku?.trim();
    const existingSku = variant.id ? existingSkuByVariantId?.get(variant.id)?.trim() : undefined;

    const preferred =
      raw && !/^c[a-z0-9]{20,}$/i.test(raw) && !seen.has(raw.toUpperCase())
        ? raw
        : existingSku && !/^c[a-z0-9]{20,}$/i.test(existingSku) && !seen.has(existingSku.toUpperCase())
          ? existingSku
          : undefined;

    let candidate =
      preferred ||
      `${productSku}-${sanitizeSkuSegment(variant.name || `V${idx + 1}`) || `V${idx + 1}`}`;

    if (seen.has(candidate.toUpperCase())) {
      const suffix = variant.id ? variant.id.slice(-4).toUpperCase() : `V${idx + 1}`;
      candidate = `${candidate}-${suffix}`;
    }
    seen.add(candidate.toUpperCase());
    return { ...variant, sku: candidate };
  });
}

export function ensureCanonicalProductUrl(slug: string, existingCanonicalUrl?: string | null): string {
  const cleanSlug = slug.trim().replace(/^\/+/, '');
  const expected = `${DEFAULT_SITE_URL}/products/${cleanSlug}`;
  if (!existingCanonicalUrl?.trim()) return expected;
  try {
    const parsed = new URL(existingCanonicalUrl);
    const expectedHost = new URL(DEFAULT_SITE_URL).hostname.replace(/^www\./, '');
    const actualHost = parsed.hostname.replace(/^www\./, '');
    return actualHost === expectedHost ? existingCanonicalUrl.trim() : expected;
  } catch {
    return expected;
  }
}

export function buildAutoProductJsonLd(input: {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  salePrice?: number | null;
  quantity?: number | null;
  trackInventory?: boolean | null;
  allowBackorder?: boolean | null;
  imageUrl?: string | null;
  brandName?: string | null;
  variants?: Array<{
    id?: string;
    sku: string;
    name: string;
    price?: number | null;
    salePrice?: number | null;
    quantity?: number | null;
    image?: string | null;
  }>;
}) {
  const canonicalUrl = ensureCanonicalProductUrl(input.slug);
  const image = input.imageUrl?.trim() || DEFAULT_CATALOG_FALLBACK_IMAGE;
  const effectivePrice =
    input.salePrice && input.salePrice > 0 && input.salePrice < input.price
      ? input.salePrice
      : input.price;
  const inStock =
    input.trackInventory === false ||
    Boolean(input.allowBackorder) ||
    Number(input.quantity ?? 0) > 0;
  const schemaAvailability = inStock
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const merchantListingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    productID: input.sku,
    sku: input.sku,
    name: input.name,
    description: input.description || input.name,
    image: [image],
    url: canonicalUrl,
    brand: {
      '@type': 'Brand',
      name: input.brandName || 'Minsah Beauty',
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'BDT',
      price: Number(effectivePrice).toFixed(2),
      availability: schemaAvailability,
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  const variants = input.variants ?? [];
  const productGroupJsonLd =
    variants.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ProductGroup',
          productGroupID: input.sku,
          name: input.name,
          description: input.description || input.name,
          url: canonicalUrl,
          brand: {
            '@type': 'Brand',
            name: input.brandName || 'Minsah Beauty',
          },
          hasVariant: variants.map((v) => {
            const vPrice =
              v.salePrice && v.salePrice > 0 && v.salePrice < (v.price || input.price)
                ? v.salePrice
                : v.price || effectivePrice;
            const vInStock =
              input.trackInventory === false ||
              Boolean(input.allowBackorder) ||
              Number(v.quantity ?? input.quantity ?? 0) > 0;
            return {
              '@type': 'Product',
              sku: v.sku,
              name: `${input.name} - ${v.name}`,
              image: v.image || image,
              offers: {
                '@type': 'Offer',
                url: v.id ? `${canonicalUrl}?variant=${encodeURIComponent(v.id)}` : canonicalUrl,
                priceCurrency: 'BDT',
                price: Number(vPrice).toFixed(2),
                availability: vInStock
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition',
              },
            };
          }),
        }
      : merchantListingJsonLd;

  return {
    canonicalUrl,
    imageUrl: image,
    merchantListingJsonLd,
    productGroupJsonLd,
  };
}

export { triggerEventDrivenCatalogSync } from '@/lib/meta-platform/domains/catalog/event-sync';
