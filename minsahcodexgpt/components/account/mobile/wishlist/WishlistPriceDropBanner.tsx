'use client';

import React from 'react';
import { TrendingDown } from 'lucide-react';

interface WishlistPriceDropBannerProps {
  discountCount: number;
  totalSaved: number;
}

export default function WishlistPriceDropBanner({
  discountCount,
  totalSaved,
}: WishlistPriceDropBannerProps) {
  if (discountCount === 0) return null;

  return (
    <section className="px-4 pb-3">
      <div className="p-3.5 rounded-2xl bg-[#EAF7D8]/60 border border-[#4b6723]/30 text-[#1c3a13] flex items-center gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-full bg-[#062402] text-[#EAF7D8] flex items-center justify-center shrink-0 shadow-xs">
          <TrendingDown className="w-4 h-4 text-[#c7edb5]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#062402]">
              Dhaka Flash Price Drop
            </span>
            <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
          </div>
          <p className="text-xs text-[#1c3a13] truncate mt-0.5">
            {discountCount} items on your wishlist have special discounts today!
          </p>
        </div>
        <span className="text-[11px] font-bold text-[#4b6723] bg-white px-2.5 py-0.5 rounded-full border border-[#4b6723]/20 shrink-0 shadow-2xs">
          Save ৳{totalSaved.toLocaleString()}
        </span>
      </div>
    </section>
  );
}
