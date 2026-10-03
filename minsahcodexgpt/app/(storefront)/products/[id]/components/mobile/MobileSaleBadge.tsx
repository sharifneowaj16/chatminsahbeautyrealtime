'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobileSaleBadgeProps {
  className?: string;
}

export function MobileSaleBadge({ className = '' }: MobileSaleBadgeProps) {
  const { offer } = useProductOffer();

  if (offer.saleState !== 'active') return null;

  const discountPercent =
    offer.compareAtPrice && offer.compareAtPrice > offer.effectivePrice
      ? Math.round(((offer.compareAtPrice - offer.effectivePrice) / offer.compareAtPrice) * 100)
      : null;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-rose-500 text-white px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-xs ${className}`}
    >
      {discountPercent ? `${discountPercent}% OFF` : 'SALE'}
    </span>
  );
}

export default MobileSaleBadge;
