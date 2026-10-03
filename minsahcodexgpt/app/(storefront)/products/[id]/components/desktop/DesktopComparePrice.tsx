'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopComparePriceProps {
  className?: string;
}

export function DesktopComparePrice({ className = '' }: DesktopComparePriceProps) {
  const { offer } = useProductOffer();

  if (!offer.compareAtPrice || offer.compareAtPrice <= offer.effectivePrice) {
    return null;
  }

  return (
    <span
      className={`font-inter text-sm md:text-[15px] text-stone-400 dark:text-stone-500 line-through ${className}`}
    >
      ৳{Math.round(offer.compareAtPrice).toLocaleString()}
    </span>
  );
}

export default DesktopComparePrice;
