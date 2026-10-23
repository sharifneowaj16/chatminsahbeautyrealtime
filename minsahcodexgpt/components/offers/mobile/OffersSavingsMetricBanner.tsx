'use client';

import { Truck } from 'lucide-react';

interface OffersSavingsMetricBannerProps {
  activeCouponsCount?: number;
  flashDealsCount?: number;
  maxSavings?: string;
}

export function OffersSavingsMetricBanner({
  activeCouponsCount = 3,
  flashDealsCount = 1,
  maxSavings = '৳850 Max',
}: OffersSavingsMetricBannerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-[#ccee9b] text-[#1c3a13] text-[11px] font-bold uppercase tracking-wider shadow-sm">
        <Truck className="w-3.5 h-3.5" />
        <span>Dhaka Same Day Dispatch • Verified Authentic</span>
      </div>

      <div className="mt-1 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold text-[#062402] tracking-tight">
          Curated Offers &amp; Savings
        </h2>
      </div>

      <p className="text-xs text-[#5A615D] leading-relaxed">
        Handpicked botanical discounts, limited flash drops, and bundle privileges.
      </p>

      {/* Micro-summary Metric Pill */}
      <div className="mt-2 bg-[#F8FAF7] border border-[#E2DED8]/60 rounded-2xl p-3 flex items-center justify-between text-center shadow-sm">
        <div className="flex-1 flex flex-col items-center">
          <span className="text-xs font-bold text-[#062402]">
            {activeCouponsCount} Active
          </span>
          <span className="text-[11px] text-[#5A615D]">
            Coupons
          </span>
        </div>
        <div className="w-[1px] h-6 bg-[#B5C4BB]/40 rounded-full" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-xs font-bold text-[#4b6723]">
            {flashDealsCount} Flash
          </span>
          <span className="text-[11px] text-[#5A615D]">
            24h Drop
          </span>
        </div>
        <div className="w-[1px] h-6 bg-[#B5C4BB]/40 rounded-full" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-xs font-bold text-[#062402]">
            {maxSavings}
          </span>
          <span className="text-[11px] text-[#5A615D]">
            Savings Cap
          </span>
        </div>
      </div>
    </div>
  );
}
