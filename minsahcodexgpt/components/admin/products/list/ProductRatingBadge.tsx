'use client';

import React from 'react';
import { Star } from 'lucide-react';

export interface ProductRatingBadgeProps {
  rating: number;
  reviews: number;
}

export function ProductRatingBadge({ rating, reviews }: ProductRatingBadgeProps) {
  return (
    <div className="flex items-center space-x-1">
      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/80" />
      <span className="text-xs text-[#F7F8F8] font-medium">{rating.toFixed(1)}</span>
      <span className="text-[10px] text-white/40">({reviews})</span>
    </div>
  );
}
