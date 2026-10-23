'use client';

import React from 'react';

interface DesktopDealPricingProps {
  salePrice: number;
  originalPrice?: number;
  className?: string;
}

export default function DesktopDealPricing({
  salePrice,
  originalPrice,
  className = '',
}: DesktopDealPricingProps) {
  const showOriginal = originalPrice && originalPrice > salePrice;

  return (
    <div className={`flex items-baseline gap-1.5 mt-2 ${className}`}>
      <span className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
        ৳{salePrice.toLocaleString()}
      </span>
      {showOriginal && (
        <span className="text-[11px] sm:text-xs text-stone-400 dark:text-stone-500 line-through">
          ৳{originalPrice.toLocaleString()}
        </span>
      )}
    </div>
  );
}
