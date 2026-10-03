'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopSaleBadgeProps {
  className?: string;
}

export function DesktopSaleBadge({ className = '' }: DesktopSaleBadgeProps) {
  const { offer } = useProductOffer();

  if (offer.saleState === 'active' && offer.regularPrice > offer.effectivePrice) {
    const discountPct = Math.round(
      ((offer.regularPrice - offer.effectivePrice) / offer.regularPrice) * 100
    );

    return (
      <span
        className={`rounded-full bg-[#D4F6A2] text-[#1c3a13] px-2.5 py-0.5 text-xs font-semibold tracking-wide shadow-xs ${className}`}
      >
        Save {discountPct}%
      </span>
    );
  }

  return (
    <span
      className={`rounded-full bg-[#D4F6A2] text-[#1c3a13] px-2.5 py-0.5 text-xs font-medium tracking-wide shadow-xs ${className}`}
    >
      Bestseller
    </span>
  );
}

export default DesktopSaleBadge;
