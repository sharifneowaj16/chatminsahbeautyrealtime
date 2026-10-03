'use client';

import { useProductOfferContext } from './ProductOfferProvider';
import type { ProductOfferSnapshot } from '@/lib/commerce/product-offer';
import type { ProductRatingSnapshot } from '@/lib/commerce/product-rating';

export interface UseProductOfferReturn {
  offer: ProductOfferSnapshot;
  productOffer: ProductOfferSnapshot;
  selectedVariant: any | null;
  isVariantSelected: boolean;
  rating?: ProductRatingSnapshot | null;
}

export function useProductOffer(): UseProductOfferReturn {
  const { offer, productOffer, selectedVariant, rating } = useProductOfferContext();

  return {
    offer,
    productOffer,
    selectedVariant,
    isVariantSelected: Boolean(selectedVariant),
    rating,
  };
}

export default useProductOffer;
