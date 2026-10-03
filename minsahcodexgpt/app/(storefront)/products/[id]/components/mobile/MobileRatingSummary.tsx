'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobileRatingSummaryProps {
  className?: string;
}

export function MobileRatingSummary({ className = '' }: MobileRatingSummaryProps) {
  const { offer } = useProductOffer();
  const rating = offer.rating;

  return (
    <div className={`flex items-center gap-1.5 text-xs text-[#1c3a13] dark:text-emerald-200 ${className}`}>
      {rating.hasReviews && rating.average != null ? (
        <>
          <div
            className="flex text-amber-500 text-xs tracking-wider"
            aria-label={`${rating.average} out of 5 stars`}
          >
            ★★★★★
          </div>
          <span className="font-bold font-inter text-xs">
            {rating.average.toFixed(1)}
          </span>
          <span className="text-[#1c3a13]/40 dark:text-white/40">•</span>
          <a
            href="#reviews-section"
            className="font-inter underline underline-offset-4 text-xs"
          >
            {rating.total} {rating.total === 1 ? 'Review' : 'Reviews'}
          </a>
        </>
      ) : (
        <div className="flex items-center gap-1 text-[11px] text-[#1c3a13]/80 dark:text-emerald-300 font-medium">
          <span className="text-amber-500">★</span>
          <span>100% Authentic Product</span>
          <span className="text-[#1c3a13]/30">•</span>
          <span className="text-stone-500 dark:text-stone-400">Cash on Delivery</span>
        </div>
      )}
    </div>
  );
}

export default MobileRatingSummary;
