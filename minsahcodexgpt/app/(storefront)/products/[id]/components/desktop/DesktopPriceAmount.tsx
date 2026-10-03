'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopPriceAmountProps {
  className?: string;
}

export function DesktopPriceAmount({ className = '' }: DesktopPriceAmountProps) {
  const { offer } = useProductOffer();

  return (
    <span
      className={`font-inter font-bold text-[22px] md:text-[24px] lg:text-[26px] text-[#1c3a13] dark:text-white leading-none ${className}`}
    >
      ৳{Math.round(offer.effectivePrice).toLocaleString()}
    </span>
  );
}

export default DesktopPriceAmount;
