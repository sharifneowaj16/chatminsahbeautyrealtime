'use client';

import React from 'react';
import { useProductOffer } from '@/components/offer/useProductOffer';

export interface DesktopStockBadgeProps {
  className?: string;
}

export function DesktopStockBadge({ className = '' }: DesktopStockBadgeProps) {
  const { offer } = useProductOffer();

  if (offer.availability === 'out of stock') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Out of Stock
      </span>
    );
  }

  if (offer.availability === 'preorder') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        Pre-order Available
      </span>
    );
  }

  if (offer.availability === 'available for order') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Available on Backorder
      </span>
    );
  }

  const isLowStock = offer.availableQuantity > 0 && offer.availableQuantity <= 5;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {isLowStock ? `Only ${offer.availableQuantity} units left` : 'In Stock'}
    </span>
  );
}

export default DesktopStockBadge;
