import type { ProductOfferSnapshot } from '../../lib/commerce/product-offer.ts';

export interface VariantRef {
  id: string;
  sku?: string | null;
  offer?: ProductOfferSnapshot;
  [key: string]: any;
}

export function resolveInitialVariantSelection(input: {
  variants?: readonly VariantRef[] | null;
  urlVariantParam?: string | null;
}): string | null {
  const { variants = [], urlVariantParam } = input;
  const list = variants || [];

  if (urlVariantParam) {
    const match = list.find((v) => v.id === urlVariantParam || v.sku === urlVariantParam);
    if (match) return match.id;
  }

  // If there is exactly one variant, auto-select it
  if (list.length === 1) {
    return list[0].id;
  }

  // In multi-variant products without URL param, default to null
  return null;
}

export function resolveActiveOffer(input: {
  productOffer: ProductOfferSnapshot;
  variants?: readonly VariantRef[] | null;
  selectedVariantId?: string | null;
}): ProductOfferSnapshot {
  const { productOffer, variants = [], selectedVariantId } = input;

  if (selectedVariantId && variants && variants.length > 0) {
    const selected = variants.find((v) => v.id === selectedVariantId);
    if (selected?.offer) {
      return selected.offer;
    }
  }

  return productOffer;
}
