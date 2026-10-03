'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface MobileStockBadgeProps {
  className?: string;
}

export function MobileStockBadge({ className = '' }: MobileStockBadgeProps) {
  const { offer } = useProductOffer();

  if (offer.availability === 'in stock') {
    if (offer.availableQuantity > 0 && offer.availableQuantity <= 5) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[11px] font-semibold border border-amber-500/30 ${className}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Only {offer.availableQuantity} left
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-semibold border border-emerald-500/30 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        In Stock
      </span>
    );
  }

  if (offer.availability === 'preorder') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-0.5 text-[11px] font-semibold border border-blue-500/30 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Pre-order
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-stone-500/10 text-stone-600 dark:text-stone-400 px-2 py-0.5 text-[11px] font-semibold border border-stone-500/30 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
      Out of Stock
    </span>
  );
}

export default MobileStockBadge;
