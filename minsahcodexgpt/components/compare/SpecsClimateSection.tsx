'use client';

import React from 'react';
import { Thermometer, Layers } from 'lucide-react';
import { ComparisonProduct } from './types';

interface SpecsClimateSectionProps {
  productA: ComparisonProduct;
  productB: ComparisonProduct;
}

export default function SpecsClimateSection({
  productA,
  productB,
}: SpecsClimateSectionProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2DED8]/60 space-y-3.5">
      <div className="flex items-center justify-between pb-1 border-b border-[#E2DED8]/40">
        <div className="flex items-center gap-2">
          <Thermometer className="text-[#4b6723] w-5 h-5" />
          <h3 className="text-[15px] font-bold text-[#1a1c1a]">
            Dhaka Climate &amp; Texture
          </h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#1c3a13] text-[#82a573] font-bold text-[10px]">
          BD Tested
        </span>
      </div>

      {/* Texture Feel */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Texture &amp; Finish
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F2F6F0]">
            <span className="font-bold text-[11px] text-[#062402] block mb-0.5">
              {productA.textureName}
            </span>
            <p className="text-[11px] text-[#5A615D] leading-snug">
              {productA.textureDesc}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F2F6F0]">
            <span className="font-bold text-[11px] text-[#062402] block mb-0.5">
              {productB.textureName}
            </span>
            <p className="text-[11px] text-[#5A615D] leading-snug">
              {productB.textureDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Humidity Score */}
      <div className="space-y-1.5">
        <div className="w-full py-1 px-3 rounded-full bg-[#F2F6F0] text-center flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-[#5A615D] font-bold">
            Humidity &amp; Heat Index Score
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-[#F2F6F0] flex flex-col items-center text-center">
            <div className="text-[18px] font-bold text-[#062402] leading-tight">
              {productA.humidityScore}{' '}
              <span className="text-[11px] font-normal text-[#5A615D]">/ 10</span>
            </div>
            <span className="text-[10px] text-[#4b6723] font-bold mt-0.5">
              {productA.humidityNote}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F2F6F0] flex flex-col items-center text-center">
            <div className="text-[18px] font-bold text-[#062402] leading-tight">
              {productB.humidityScore}{' '}
              <span className="text-[11px] font-normal text-[#5A615D]">/ 10</span>
            </div>
            <span className="text-[10px] text-[#4b6723] font-bold mt-0.5">
              {productB.humidityNote}
            </span>
          </div>
        </div>
      </div>

      {/* Pilling under SPF */}
      <div className="p-2.5 rounded-xl bg-[#F2F6F0] flex items-center justify-between text-[#1a1c1a]">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#062402]" />
          <span className="text-[12px] font-medium">Pilling under Sunscreen:</span>
        </div>
        <span className="text-[11px] font-bold text-[#062402]">
          Zero Pilling (Both)
        </span>
      </div>
    </div>
  );
}
