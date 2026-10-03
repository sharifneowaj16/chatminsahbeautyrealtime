'use client';

import { useProductOfferContext } from './ProductOfferProvider';

export interface UseSelectedVariantReturn {
  selectedVariantId: string | null;
  setSelectedVariantId: (id: string | null) => void;
  selectedVariant: any | null;
  variants: any[];
  hasVariants: boolean;
}

export function useSelectedVariant(): UseSelectedVariantReturn {
  const { selectedVariantId, setSelectedVariantId, selectedVariant, variants } = useProductOfferContext();

  return {
    selectedVariantId,
    setSelectedVariantId,
    selectedVariant,
    variants,
    hasVariants: Array.isArray(variants) && variants.length > 0,
  };
}

export default useSelectedVariant;
