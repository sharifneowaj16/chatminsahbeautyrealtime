'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface DesktopDealRatingBadgeProps {
  rating?: number;
  ratingCount?: number;
  className?: string;
}

export default function DesktopDealRatingBadge({
  rating,
  ratingCount,
  className = '',
}: DesktopDealRatingBadgeProps) {
  if (!rating) return null;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 text-[10px] sm:text-[11px] font-semibold shadow-xs backdrop-blur-xs select-none ${className}`}
    >
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
      <span>{rating.toFixed(2).replace(/\.00$/, '')}</span>
      {ratingCount && (
        <span className="text-stone-400 text-[9px] font-normal">
          ({ratingCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}
