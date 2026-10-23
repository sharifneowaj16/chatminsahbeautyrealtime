'use client';

import React from 'react';
import { FlaskConical, Droplet, Leaf, CheckCircle2 } from 'lucide-react';
import { ComparisonProduct } from './types';

interface SpecsActivesSectionProps {
  productA: ComparisonProduct;
  productB: ComparisonProduct;
}

export default function SpecsActivesSection({
  productA,
  productB,
}: SpecsActivesSectionProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2DED8]/60 space-y-3.5">
      <div className="flex items-center gap-2 pb-1 border-b border-[#E2DED8]/40">
        <FlaskConical className="text-[#4b6723] w-5 h-5" />
        <h3 className="text-[15px] font-bold text-[#1a1c1a]">
          Key Active Ingredients &amp; Purity
        </h3>
      </div>

      {/* Hero Actives */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Hero Actives
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] space-y-1.5">
            <div className="flex items-center gap-1 text-[#062402]">
              <Droplet className="w-4 h-4 text-[#4b6723]" />
              <span className="font-bold text-[11px]">{productA.heroActiveName}</span>
            </div>
            <p className="text-[11px] text-[#5A615D] leading-tight">
              {productA.heroActiveDesc}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] space-y-1.5">
            <div className="flex items-center gap-1 text-[#062402]">
              <Leaf className="w-4 h-4 text-[#4b6723]" />
              <span className="font-bold text-[11px]">{productB.heroActiveName}</span>
            </div>
            <p className="text-[11px] text-[#5A615D] leading-tight">
              {productB.heroActiveDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Clean Beauty Safety */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Safety &amp; Clean Rating
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-bold text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Clean</span>
            </div>
            <p className="text-[11px] text-[#5A615D]">
              {productA.cleanDesc}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] space-y-1.5 text-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-bold text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Clean</span>
            </div>
            <p className="text-[11px] text-[#5A615D]">
              {productB.cleanDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Comedogenic Rating */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex items-center justify-between">
          <span className="text-[11px] text-[#5A615D]">Comedogenic</span>
          <span className="px-2 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[10px] font-bold">
            {productA.comedogenicRating}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex items-center justify-between">
          <span className="text-[11px] text-[#5A615D]">Comedogenic</span>
          <span className="px-2 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] text-[10px] font-bold">
            {productB.comedogenicRating}
          </span>
        </div>
      </div>
    </div>
  );
}
