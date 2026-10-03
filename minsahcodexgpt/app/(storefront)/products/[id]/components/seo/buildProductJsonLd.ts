import { resolveProductOffer, type ProductOfferSnapshot } from '../../../../../../lib/commerce/product-offer.ts';

export function schemaOrgAvailability(availability: string): string {
  switch (availability) {
    case 'in stock':
      return 'https://schema.org/InStock';
    case 'out of stock':
      return 'https://schema.org/OutOfStock';
    case 'available for order':
      return 'https://schema.org/BackOrder';
    case 'preorder':
      return 'https://schema.org/PreOrder';
    case 'discontinued':
      return 'https://schema.org/Discontinued';
    default:
      return 'https://schema.org/OutOfStock';
  }
}

export function schemaOrgCondition(condition?: string): string {
  switch (condition?.toUpperCase()) {
    case 'USED':
      return 'https://schema.org/UsedCondition';
    case 'REFURBISHED':
      return 'https://schema.org/RefurbishedCondition';
    default:
      return 'https://schema.org/NewCondition';
  }
}

export interface BuildDynamicProductJsonLdInput {
  product: {
    id: string;
    price: number | { toNumber(): number } | string;
    [key: string]: any;
  };
  rating?: { average: number | null; total: number } | null;
  productUrl: string;
  now?: Date;
}

export function buildDynamicProductJsonLd(input: BuildDynamicProductJsonLdInput): Record<string, unknown> {
  const { product, rating, productUrl, now = new Date() } = input;

  const defaultValidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const productOffer: ProductOfferSnapshot = product.offer ?? resolveProductOffer({ product: product as any, now });

  const images: string[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const img of product.images) {
      if (typeof img === 'string') images.push(img);
      else if (img && typeof img.url === 'string') images.push(img.url);
    }
  } else if (product.image) {
    images.push(product.image);
  }

  // Parse admin supplemental JSON-LD if present
  let supplementalData: Record<string, unknown> = {};
  if (product.structuredDataJsonLd) {
    if (typeof product.structuredDataJsonLd === 'object') {
      supplementalData = { ...product.structuredDataJsonLd };
    } else if (typeof product.structuredDataJsonLd === 'string') {
      try {
        const parsed = JSON.parse(product.structuredDataJsonLd);
        if (parsed && typeof parsed === 'object') supplementalData = parsed;
      } catch {
        supplementalData = {};
      }
    }
  }

  // Build dynamic offers strictly from resolver
  let resolvedOffers: Record<string, unknown> | Array<Record<string, unknown>>;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) {
    const baseProductUrl = productUrl.split('?')[0];
    resolvedOffers = variants.map((v: any) => {
      const vOffer: ProductOfferSnapshot = v.offer ?? resolveProductOffer({ product: product as any, variant: v, now });
      const offerUrl = `${baseProductUrl}?variant=${encodeURIComponent(v.id)}`;
      const validUntil = vOffer.saleEndsAt
        ? new Date(vOffer.saleEndsAt).toISOString().split('T')[0]
        : defaultValidUntil;

      return {
        '@type': 'Offer',
        '@id': `${offerUrl}#offer`,
        url: offerUrl,
        sku: v.sku || v.id,
        name: v.name,
        price: vOffer.effectivePrice,
        priceCurrency: vOffer.currency,
        priceValidUntil: validUntil,
        availability: schemaOrgAvailability(vOffer.availability),
        itemCondition: schemaOrgCondition(product.condition),
        seller: {
          '@type': 'Organization',
          name: 'Minsah Beauty',
        },
      };
    });
  } else {
    const validUntil = productOffer.saleEndsAt
      ? new Date(productOffer.saleEndsAt).toISOString().split('T')[0]
      : defaultValidUntil;

    resolvedOffers = {
      '@type': 'Offer',
      '@id': `${productUrl}#offer`,
      url: productUrl,
      sku: product.sku || product.id,
      price: productOffer.effectivePrice,
      priceCurrency: productOffer.currency,
      priceValidUntil: validUntil,
      availability: schemaOrgAvailability(productOffer.availability),
      itemCondition: schemaOrgCondition(product.condition),
      seller: {
        '@type': 'Organization',
        name: 'Minsah Beauty',
      },
    };
  }

  const baseSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': variants.length > 0 ? 'ProductGroup' : 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: product.description || product.shortDescription || '',
    sku: product.sku || product.id,
    url: productUrl,
    image: images.length > 0 ? images : undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Minsah Beauty',
    },
  };

  if (product.gtin) baseSchema.gtin13 = product.gtin;
  if (product.weight) {
    baseSchema.weight = {
      '@type': 'QuantitativeValue',
      value: product.weight,
      unitCode: 'GRM',
    };
  }

  if (rating && rating.total > 0 && rating.average != null && rating.average > 0) {
    baseSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.average,
      reviewCount: rating.total,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Merge supplemental data while STRICTLY enforcing offers and core identifiers from resolver
  const merged = {
    ...baseSchema,
    ...supplementalData,
    ...baseSchema, // Re-apply base to preserve context, type, and id
    offers: resolvedOffers, // GUARANTEE resolver is single source of truth for pricing/offers
  };

  return merged;
}
