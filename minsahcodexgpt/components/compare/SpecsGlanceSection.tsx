'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { ComparisonProduct } from './types';

interface SpecsGlanceSectionProps {
  productA: ComparisonProduct;
  productB: ComparisonProduct;
}

export default function SpecsGlanceSection({
  productA,
  productB,
}: SpecsGlanceSectionProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2DED8]/60 space-y-3.5">
      <div className="flex items-center gap-2 pb-1 border-b border-[#E2DED8]/40">
        <Sparkles className="text-[#4b6723] w-5 h-5" />
        <h3 className="text-[15px] font-bold text-[#1a1c1a]">
          At a Glance &amp; Verdict
        </h3>
      </div>

      {/* Best For Comparison */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Best For / Routine Step
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex flex-col justify-between">
            <span className="text-[12px] font-semibold text-[#062402] leading-tight">
              {productA.bestFor}
            </span>
            <span className="text-[10px] text-[#5A615D] mt-1">
              {productA.routineStep}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex flex-col justify-between">
            <span className="text-[12px] font-semibold text-[#062402] leading-tight">
              {productB.bestFor}
            </span>
            <span className="text-[10px] text-[#5A615D] mt-1">
              {productB.routineStep}
            </span>
          </div>
        </div>
      </div>

      {/* Target Skin Type */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Target Skin Type
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F2F6F0]">
            <div className="flex flex-wrap gap-1 mb-1">
              {productA.targetSkinTypes.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded-md bg-[#e9e8e5] text-[#062402] font-bold text-[10px]"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[#5A615D] leading-snug">
              {productA.targetSkinNote}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F2F6F0]">
            <div className="flex flex-wrap gap-1 mb-1">
              {productB.targetSkinTypes.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded-md bg-[#D4F6A2] text-[#062402] font-bold text-[10px]"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[#5A615D] leading-snug">
              {productB.targetSkinNote}
            </p>
          </div>
        </div>
      </div>

      {/* Core Benefit */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Core Mechanism
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] text-[#1a1c1a]">
            <p className="text-[12px] leading-snug font-medium">
              {productA.coreBenefit}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F2F6F0] text-[#1a1c1a]">
            <p className="text-[12px] leading-snug font-medium">
              {productB.coreBenefit}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
