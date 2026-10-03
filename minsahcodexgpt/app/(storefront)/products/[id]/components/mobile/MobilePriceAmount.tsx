'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobilePriceAmountProps {
  className?: string;
}

export function MobilePriceAmount({ className = '' }: MobilePriceAmountProps) {
  const { offer } = useProductOffer();

  return (
    <span
      className={`font-inter font-bold text-[22px] text-[#1c3a13] dark:text-white leading-none ${className}`}
    >
      ৳{Math.round(offer.effectivePrice).toLocaleString()}
    </span>
  );
}

export default MobilePriceAmount;
