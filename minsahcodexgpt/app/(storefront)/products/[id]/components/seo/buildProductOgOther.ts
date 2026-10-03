import type { ProductOfferSnapshot } from '../../../../../../lib/commerce/product-offer.ts';

export interface BuildProductOgOtherInput {
  product: {
    id: string;
    brand?: string | null;
    condition?: string | null;
    [key: string]: any;
  };
  offer: ProductOfferSnapshot;
}

/**
 * Builds the Meta-compliant OpenGraph `other` metadata map for product pages.
 * Meta crawlers (facebookexternalhit, Facebot) inspect these tags for price, currency,
 * availability, and item ID parity against Meta Commerce Manager Catalogs.
 */
export function buildProductOgOther(input: BuildProductOgOtherInput): Record<string, string> {
  const { product, offer } = input;

  const condition = (product.condition || 'new').toLowerCase();
  const brand = product.brand || 'Minsah Beauty';

  return {
    'product:price:amount': String(offer.effectivePrice),
    'product:price:currency': offer.currency,
    'product:availability': offer.availability,
    'product:retailer_item_id': offer.retailerId,
    'product:condition': condition,
    'product:brand': brand,
  };
}
