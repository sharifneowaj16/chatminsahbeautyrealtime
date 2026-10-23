'use client';

import React from 'react';
import { Truck, Zap } from 'lucide-react';
import { ComparisonProduct } from './types';

interface SpecsPackagingSectionProps {
  productA: ComparisonProduct;
  productB: ComparisonProduct;
}

export default function SpecsPackagingSection({
  productA,
  productB,
}: SpecsPackagingSectionProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2DED8]/60 space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-[#E2DED8]/40">
        <Truck className="text-[#4b6723] w-5 h-5" />
        <h3 className="text-[15px] font-bold text-[#1a1c1a]">
          Packaging &amp; Banani Hub Dispatch
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex flex-col gap-1">
          <span className="text-[10px] uppercase text-[#5A615D] font-bold">
            Bottle Type
          </span>
          <span className="text-[12px] font-bold text-[#1a1c1a]">
            {productA.bottleType}
          </span>
          <span className="text-[11px] text-[#5A615D]">
            {productA.bottleDesc}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex flex-col gap-1">
          <span className="text-[10px] uppercase text-[#5A615D] font-bold">
            Bottle Type
          </span>
          <span className="text-[12px] font-bold text-[#1a1c1a]">
            {productB.bottleType}
          </span>
          <span className="text-[11px] text-[#5A615D]">
            {productB.bottleDesc}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#F2F6F0] flex items-center gap-2.5">
        <Zap className="text-[#062402] w-5 h-5 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#1a1c1a]">
            Same-Day Express Dispatch
          </span>
          <span className="text-[11px] text-[#5A615D]">
            Orders placed before 2:00 PM ship same day from our Banani, Dhaka hub.
          </span>
        </div>
      </div>
    </div>
  );
}
