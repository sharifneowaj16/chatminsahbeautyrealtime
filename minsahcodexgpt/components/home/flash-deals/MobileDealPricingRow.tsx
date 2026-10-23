'use client';

import React from 'react';
import MobileClaimButton from './MobileClaimButton';

interface MobileDealPricingRowProps {
  salePrice: number;
  originalPrice?: number;
  claimedPercentage?: number;
  onClaim?: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  className?: string;
}

export default function MobileDealPricingRow({
  salePrice,
  originalPrice,
  claimedPercentage = 80,
  onClaim,
  isLoading = false,
  isSuccess = false,
  className = '',
}: MobileDealPricingRowProps) {
  const safePercent = Math.max(0, Math.min(100, claimedPercentage));
  const showOriginal = originalPrice && originalPrice > salePrice;

  return (
    <div className={`flex flex-col gap-1.5 mt-1.5 ${className}`}>
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
          style={{ width: `${safePercent}%` }}
        />
      </div>

      {/* Price & Claim Button Row */}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-extrabold text-stone-900 dark:text-white">
            ৳{salePrice.toLocaleString()}
          </span>
          {showOriginal && (
            <span className="text-[10px] text-stone-400 line-through">
              ৳{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        <MobileClaimButton
          onClick={onClaim}
          isLoading={isLoading}
          isSuccess={isSuccess}
        />
      </div>
    </div>
  );
}
