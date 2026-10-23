'use client';

import React from 'react';

interface FlashDealsBadgeProps {
  label?: string;
  isMobileCompact?: boolean;
}

export default function FlashDealsBadge({
  label = 'HIGH DEMAND BATCH DROP',
  isMobileCompact = false,
}: FlashDealsBadgeProps) {
  if (isMobileCompact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold tracking-wide shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span>HIGH DEMAND</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-[11px] sm:text-xs tracking-wider uppercase">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
      <span>{label}</span>
    </div>
  );
}
