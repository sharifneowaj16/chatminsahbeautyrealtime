'use client';

import React from 'react';
import { ShieldCheck, ArrowUpDown } from 'lucide-react';
import type { WishlistFilterType, WishlistSortType } from './types';

interface WishlistFilterRibbonProps {
  currentFilter: WishlistFilterType;
  onSelectFilter: (filter: WishlistFilterType) => void;
  counts: {
    all: number;
    instock: number;
    pricedrop: number;
    suncare: number;
    serum: number;
  };
  currentSort: WishlistSortType;
  onToggleSort: () => void;
  sortLabel: string;
}

export default function WishlistFilterRibbon({
  currentFilter,
  onSelectFilter,
  counts,
  onToggleSort,
  sortLabel,
}: WishlistFilterRibbonProps) {
  const filterList: Array<{ key: WishlistFilterType; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'instock', label: 'In Stock', count: counts.instock },
    { key: 'pricedrop', label: 'Price Drop', count: counts.pricedrop },
    { key: 'suncare', label: 'Sun Care', count: counts.suncare },
    { key: 'serum', label: 'Serums', count: counts.serum },
  ];

  return (
    <section className="px-4 pb-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {filterList.map((f) => {
          const isActive = currentFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onSelectFilter(f.key)}
              className={`h-9 px-4 rounded-full text-xs font-bold active:scale-95 transition-all shrink-0 flex items-center gap-2 shadow-xs cursor-pointer ${
                isActive
                  ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                  : 'bg-[#F2F6F0] border border-[#E2DED8]/70 text-[#1c3a13] hover:bg-[#E8F0E5]'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center font-bold ${
                  isActive
                    ? 'bg-[#28531c] text-[#D4F6A2]'
                    : 'bg-[#E2DED8]/70 text-[#43483f]'
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#43483f] px-0.5">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
          <span>Guaranteed Temperature Controlled Dispatch</span>
        </span>
        <button
          type="button"
          onClick={onToggleSort}
          className="inline-flex items-center gap-1 text-[11px] text-[#062402] font-bold active:scale-95 transition-transform"
        >
          <span>{sortLabel}</span>
          <ArrowUpDown className="w-3 h-3 text-[#4b6723]" />
        </button>
      </div>
    </section>
  );
}
