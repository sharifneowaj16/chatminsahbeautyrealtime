'use client';

import { useState } from 'react';

interface PriceRangeSliderProps {
  minPrice: number;
  maxPrice: number;
  onChange: (min: number, max: number) => void;
}

const PRESETS = [
  { label: 'Under ৳1,000', min: 500, max: 1000 },
  { label: '৳1,000 - ৳2,500', min: 1000, max: 2500 },
  { label: '৳2,500 - ৳4,000', min: 2500, max: 4000 },
  { label: '৳4,000+', min: 4000, max: 5000 },
];

export function PriceRangeSlider({
  minPrice,
  maxPrice,
  onChange,
}: PriceRangeSliderProps) {
  const MIN_LIMIT = 500;
  const MAX_LIMIT = 5000;

  const leftPercent = Math.max(0, Math.min(100, ((minPrice - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100));
  const rightPercent = Math.max(0, Math.min(100, 100 - ((maxPrice - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100));

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val < maxPrice - 200) {
      onChange(val, maxPrice);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val > minPrice + 200) {
      onChange(minPrice, val);
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-[#f4f3f1]/70 p-3.5 rounded-[24px] border border-[#E2DED8]/40 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#062402] uppercase tracking-wider">
          মূল্যের পরিসীমা (Price Range)
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[11px] font-bold shadow-sm">
          ৳{minPrice.toLocaleString('bn-BD')} — ৳{maxPrice.toLocaleString('bn-BD')}
        </span>
      </div>

      {/* Visual Dual Slider Track */}
      <div className="pt-2.5 pb-1 px-1">
        <div className="relative flex items-center h-6 w-full">
          {/* Base track */}
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-[#e3e2e0]" />

          {/* Active green range track */}
          <div
            className="absolute h-1.5 rounded-full bg-[#4b6723]"
            style={{
              left: `${leftPercent}%`,
              right: `${rightPercent}%`,
            }}
          />

          {/* Native HTML Range Inputs layered transparently */}
          <input
            type="range"
            min={MIN_LIMIT}
            max={MAX_LIMIT}
            step={50}
            value={minPrice}
            onChange={handleMinChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-20"
          />
          <input
            type="range"
            min={MIN_LIMIT}
            max={MAX_LIMIT}
            step={50}
            value={maxPrice}
            onChange={handleMaxChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-20"
          />

          {/* Left Custom Visual Thumb */}
          <div
            className="absolute -translate-x-1/2 w-5 h-5 rounded-full bg-[#1c3a13] border-2 border-[#D4F6A2] shadow-md flex items-center justify-center pointer-events-none transition-transform z-10"
            style={{ left: `${leftPercent}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4F6A2]" />
          </div>

          {/* Right Custom Visual Thumb */}
          <div
            className="absolute translate-x-1/2 w-5 h-5 rounded-full bg-[#1c3a13] border-2 border-[#D4F6A2] shadow-md flex items-center justify-center pointer-events-none transition-transform z-10"
            style={{ right: `${rightPercent}%` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4F6A2]" />
          </div>
        </div>

        {/* Min / Max Labels */}
        <div className="flex justify-between items-center text-[10px] text-[#43483f]/70 mt-2 font-medium">
          <span>Min ৳৫০০</span>
          <span className="font-bold text-[#062402]">৳২,৫০০ গড়</span>
          <span>Max ৳৫,০০০</span>
        </div>
      </div>

      {/* Quick Presets Pills */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {PRESETS.map((p) => {
          const isActive = minPrice === p.min && maxPrice === p.max;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.min, p.max)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#1c3a13] text-white shadow-xs'
                  : 'bg-white text-[#43483f] border border-[#E2DED8]/70 hover:bg-[#EAF7D8]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
