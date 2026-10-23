'use client';

import Image from 'next/image';
import { Plus, ShoppingBag } from 'lucide-react';
import { formatPrice } from '@/utils/currency';
import { CuratedBundle } from './types';

interface OffersCuratedBundleCardProps {
  bundle: CuratedBundle;
  onAddBundle: (bundle: CuratedBundle) => void;
}

export function OffersCuratedBundleCard({
  bundle,
  onAddBundle,
}: OffersCuratedBundleCardProps) {
  return (
    <div className="bg-white rounded-[28px] p-4 shadow-sm border border-[#E2DED8]/60 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-0.5 rounded-full bg-[#ccee9b] text-[#1c3a13] text-[11px] font-bold">
          {bundle.savingsBadge}
        </span>
        <span className="text-[11px] text-[#5A615D] uppercase tracking-wider font-bold">
          {bundle.routineType}
        </span>
      </div>

      {/* Dual Product Showcase */}
      <div className="flex items-center gap-2">
        {/* Item 1 */}
        <div className="flex-1 rounded-[22px] bg-[#F2F6F0] p-2.5 flex flex-col items-center border border-[#E2DED8]/40">
          <div className="relative w-full h-24 rounded-xl overflow-hidden">
            <Image
              src={bundle.item1.image}
              alt={bundle.item1.name}
              fill
              className="object-contain"
              sizes="140px"
            />
          </div>
          <span className="text-[11px] font-bold text-[#062402] mt-1 text-center truncate w-full">
            {bundle.item1.name}
          </span>
          <span className="text-[10px] text-[#5A615D]">
            {bundle.item1.size}
          </span>
        </div>

        {/* Plus connector */}
        <div className="flex items-center justify-center shrink-0">
          <div className="w-7 h-7 rounded-full bg-[#E8F0E5] flex items-center justify-center text-[#062402]">
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex-1 rounded-[22px] bg-[#F2F6F0] p-2.5 flex flex-col items-center border border-[#E2DED8]/40">
          <div className="relative w-full h-24 rounded-xl overflow-hidden">
            <Image
              src={bundle.item2.image}
              alt={bundle.item2.name}
              fill
              className="object-contain"
              sizes="140px"
            />
          </div>
          <span className="text-[11px] font-bold text-[#062402] mt-1 text-center truncate w-full">
            {bundle.item2.name}
          </span>
          <span className="text-[10px] text-[#5A615D]">
            {bundle.item2.size}
          </span>
        </div>
      </div>

      {/* Bundle Info */}
      <div className="flex flex-col gap-1">
        <h4 className="text-base text-[#062402] font-bold">
          {bundle.title}
        </h4>
        <p className="text-xs text-[#5A615D] leading-relaxed">
          {bundle.description}
        </p>
      </div>

      {/* Pricing & CTA */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl text-[#062402] font-bold">
              {formatPrice(bundle.price)}
            </span>
            <span className="text-xs text-[#5A615D] line-through">
              {formatPrice(bundle.originalPrice)}
            </span>
          </div>
          <span className="text-[11px] text-[#4b6723] font-bold">
            Immediate {formatPrice(bundle.savingsAmount)} Combo Savings
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddBundle(bundle)}
          className="px-4 py-2 rounded-full bg-[#062402] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Add Bundle</span>
        </button>
      </div>
    </div>
  );
}
