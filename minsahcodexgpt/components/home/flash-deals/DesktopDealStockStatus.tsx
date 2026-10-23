'use client';

import React from 'react';

interface DesktopDealStockStatusProps {
  urgencyText?: string;
  claimedPercentage?: number;
  className?: string;
}

export default function DesktopDealStockStatus({
  urgencyText = 'Only few units left!',
  claimedPercentage = 85,
  className = '',
}: DesktopDealStockStatusProps) {
  return (
    <div className={`flex items-center justify-between text-[10px] sm:text-[11px] mt-1.5 ${className}`}>
      <span className="font-semibold text-red-600 dark:text-red-400">
        {urgencyText}
      </span>
      {claimedPercentage != null && (
        <span className="text-stone-500 dark:text-stone-400 font-medium">
          {claimedPercentage}% Claimed
        </span>
      )}
    </div>
  );
}
