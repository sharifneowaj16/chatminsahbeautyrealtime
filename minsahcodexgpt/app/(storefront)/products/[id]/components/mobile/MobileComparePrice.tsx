'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobileComparePriceProps {
  className?: string;
}

export function MobileComparePrice({ className = '' }: MobileComparePriceProps) {
  const { offer } = useProductOffer();

  if (!offer.compareAtPrice || offer.compareAtPrice <= offer.effectivePrice) {
    return null;
  }

  return (
    <span
      className={`font-inter text-xs text-stone-400 dark:text-stone-500 line-through ${className}`}
    >
      ৳{Math.round(offer.compareAtPrice).toLocaleString()}
    </span>
  );
}

export default MobileComparePrice;
