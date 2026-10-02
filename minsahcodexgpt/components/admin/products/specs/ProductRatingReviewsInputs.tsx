'use client';

import React from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface ProductRatingReviewsInputsProps {
  rating: number;
  reviews: number;
  onChangeRating: (val: number) => void;
  onChangeReviews: (val: number) => void;
}

export function ProductRatingReviewsInputs({
  rating,
  reviews,
  onChangeRating,
  onChangeReviews,
}: ProductRatingReviewsInputsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" />
          Average Rating (0.0 – 5.0)
        </label>
        <Input
          type="number"
          min="0"
          max="5"
          step="0.1"
          value={rating || 0}
          onChange={(e) => onChangeRating(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-white/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-white/50" />
          Total Reviews Count
        </label>
        <Input
          type="number"
          min="0"
          value={reviews || 0}
          onChange={(e) => onChangeReviews(parseInt(e.target.value, 10) || 0)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-white/20"
        />
      </div>
    </div>
  );
}
