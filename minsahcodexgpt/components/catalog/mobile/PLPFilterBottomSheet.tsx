'use client';

import React, { useState } from 'react';
import type { PLPFilterState } from './types';

interface PLPFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: PLPFilterState) => void;
  initialFilters?: PLPFilterState;
  itemCount?: number;
}

const BRANDS = ['Anua', 'COSRX', 'Laneige', 'Beauty of Joseon', 'Round Lab', 'Skin1004'];
const PRICE_RANGES = ['Under ৳1,500', '৳1,500 - ৳2,500', 'Above ৳2,500'];
const HUBS = ['Gulshan 1 & 2 Depot', 'Banani Express Hub'];

export default function PLPFilterBottomSheet({
  isOpen,
  onClose,
  onApply,
  initialFilters = { priceRange: '৳1,500 - ৳2,500', brands: ['Anua'], hubs: ['Gulshan 1 & 2 Depot', 'Banani Express Hub'] },
  itemCount = 24,
}: PLPFilterBottomSheetProps) {
  const [priceRange, setPriceRange] = useState<string | null>(initialFilters.priceRange);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialFilters.brands);
  const [selectedHubs, setSelectedHubs] = useState<string[]>(initialFilters.hubs);

  if (!isOpen) return null;

  const toggleBrand = (b: string) => {
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const toggleHub = (h: string) => {
    setSelectedHubs((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  };

  const handleReset = () => {
    setPriceRange(null);
    setSelectedBrands([]);
    setSelectedHubs([]);
  };

  const handleApply = () => {
    onApply({
      priceRange,
      brands: selectedBrands,
      hubs: selectedHubs,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-[#062402]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Content Container */}
      <div className="relative z-10 max-h-[85vh] bg-[#faf9f6] rounded-t-[32px] p-6 flex flex-col gap-5 shadow-2xl overflow-y-auto border-t border-[#E2DED8]">
        {/* Handle & Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-1 rounded-full bg-[#e3e2e0]" />
          <div className="w-full flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <svg className="text-[#062402]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
              </svg>
              <h3 className="text-[19px] text-[#181C1A] font-bold tracking-tight">
                Filter Formulations
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F2F6F0] hover:bg-[#e9e8e5] flex items-center justify-center text-[#5A615D] active:scale-95 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 1. Price Range Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#181C1A] uppercase tracking-wider">
            Price Range (BDT)
          </span>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGES.map((range) => {
              const active = priceRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setPriceRange(active ? null : range)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
                    active
                      ? 'bg-[#1c3a13] text-[#D4F6A2] font-bold shadow-sm'
                      : 'bg-[#F2F6F0] text-[#181C1A] hover:bg-[#EAF7D8]'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Brand Authenticity Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#181C1A] uppercase tracking-wider">
            Verified K-Brands
          </span>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map((brand) => {
              const active = selectedBrands.includes(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => toggleBrand(brand)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1 transition-all active:scale-95 ${
                    active
                      ? 'bg-[#EAF7D8] text-[#1c3a13] font-bold border border-[#ccee9b]'
                      : 'bg-[#F2F6F0] text-[#5A615D] hover:text-[#181C1A]'
                  }`}
                >
                  <span>{brand}</span>
                  {active && (
                    <svg className="text-[#4b6723]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Dhaka Availability Hub */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#181C1A] uppercase tracking-wider">
            Fast Dispatch Hub
          </span>
          <div className="grid grid-cols-2 gap-2">
            {HUBS.map((hub) => {
              const active = selectedHubs.includes(hub);
              return (
                <label
                  key={hub}
                  onClick={() => toggleHub(hub)}
                  className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-transform border ${
                    active
                      ? 'bg-[#EAF7D8]/60 border-[#ccee9b]'
                      : 'bg-[#F2F6F0] border-[#E2DED8]/60'
                  }`}
                >
                  <span className="text-[12px] font-semibold text-[#181C1A] truncate pr-2">
                    {hub}
                  </span>
                  <input
                    type="checkbox"
                    checked={active}
                    readOnly
                    className="w-4 h-4 accent-[#062402] rounded cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 rounded-full bg-[#F2F6F0] text-[#5A615D] hover:text-[#181C1A] text-[13px] font-bold transition-colors"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[2] py-3 rounded-full bg-[#1c3a13] text-[#D4F6A2] text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
          >
            <span>Apply ({itemCount} Items)</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
