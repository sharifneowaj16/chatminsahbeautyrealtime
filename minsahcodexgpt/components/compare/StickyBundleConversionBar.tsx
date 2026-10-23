'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { ComparisonProduct } from './types';

interface StickyBundleConversionBarProps {
  productA: ComparisonProduct;
  productB: ComparisonProduct;
  onAddBundle: () => void;
}

export default function StickyBundleConversionBar({
  productA,
  productB,
  onAddBundle,
}: StickyBundleConversionBarProps) {
  const combinedOriginal = productA.originalPrice + productB.originalPrice;
  const combinedDiscounted = productA.price + productB.price - 200; // Extra ৳200 bundle discount
  const savings = combinedOriginal - combinedDiscounted;

  return (
    <div className="fixed bottom-16 inset-x-0 z-40 bg-white/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(6,36,2,0.08)] px-4 py-3 border-t border-[#E2DED8]/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[9px] uppercase tracking-wider font-bold">
              Routine Bundle
            </span>
            <span className="text-[11px] text-[#4b6723] font-bold">
              Save ৳{savings.toLocaleString()}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] text-[#062402] font-bold">
              ৳{combinedDiscounted.toLocaleString()}
            </span>
            <span className="text-[11px] line-through text-[#5A615D]/70">
              ৳{combinedOriginal.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-[#5A615D] leading-tight truncate">
            {productB.name.split(' ')[0]} (Preps) + {productA.name.split(' ')[0]} (Glows)
          </span>
        </div>

        <button
          type="button"
          onClick={onAddBundle}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white text-xs font-bold tracking-wide shrink-0 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border border-[#ccee9b]/20"
        >
          <Layers className="w-4 h-4 text-[#D4F6A2]" />
          <span>Add Pair Bundle</span>
        </button>
      </div>
    </div>
  );
}
