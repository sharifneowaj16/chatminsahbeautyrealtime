'use client';

import React from 'react';
import { useSelectedVariant } from '@/components/offer/useSelectedVariant';

export interface MobileVariantPriceChipProps {
  className?: string;
}

export function MobileVariantPriceChip({ className = '' }: MobileVariantPriceChipProps) {
  const { variants, selectedVariantId, setSelectedVariantId, hasVariants } = useSelectedVariant();

  if (!hasVariants) return null;

  return (
    <div className={`space-y-1.5 mb-3 ${className}`}>
      <span className="text-[11px] font-semibold text-[#1c3a13]/80 dark:text-stone-300 block uppercase tracking-wider">
        Select Variant
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const vOffer = variant.offer;
          const price = vOffer ? Math.round(vOffer.effectivePrice) : Math.round(variant.price);
          const isOutOfStock = vOffer ? vOffer.availability === 'out of stock' : variant.stock === 0;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSelectedVariantId(variant.id)}
              disabled={isOutOfStock}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'border-[#1c3a13] bg-[#1c3a13] text-white shadow-xs dark:bg-emerald-600 dark:border-emerald-500'
                  : isOutOfStock
                  ? 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800'
                  : 'border-stone-200 bg-white text-[#1c3a13] active:bg-stone-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-stone-200'
              }`}
            >
              <span>{variant.name}</span>
              <span className={`font-bold ${isSelected ? 'text-white' : 'text-[#1c3a13]/70 dark:text-stone-400'}`}>
                ৳{price.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MobileVariantPriceChip;
