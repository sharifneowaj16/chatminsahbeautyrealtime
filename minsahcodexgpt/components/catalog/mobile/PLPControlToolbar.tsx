'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { PLPLayoutView, PLPSortOption } from './types';

interface PLPControlToolbarProps {
  layout: PLPLayoutView;
  onChangeLayout: (layout: PLPLayoutView) => void;
  selectedSort: PLPSortOption;
  onSelectSort: (sort: PLPSortOption) => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
}

const SORT_OPTIONS: PLPSortOption[] = [
  'Popularity',
  'Price: Low to High',
  'Price: High to Low',
  'Customer Rating',
  'Newest Arrivals',
];

export default function PLPControlToolbar({
  layout,
  onChangeLayout,
  selectedSort,
  onSelectSort,
  activeFilterCount,
  onOpenFilter,
}: PLPControlToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section aria-label="Filter and Sort controls" className="px-4 pt-2 pb-3 flex items-center justify-between gap-2 relative z-20">
      {/* 1. Filter CTA with counter badge */}
      <button
        type="button"
        onClick={onOpenFilter}
        className="h-9 px-4 rounded-full bg-[#F2F6F0] hover:bg-[#e9e8e5] text-[#181C1A] flex items-center gap-2 transition-transform active:scale-95 shadow-xs border border-[#E2DED8]/70 cursor-pointer"
      >
        <svg className="text-[#062402]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span className="text-[12px] font-bold">Filters</span>
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#1c3a13] text-[#D4F6A2] text-[11px] flex items-center justify-center font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* 2. Sort Dropdown */}
      <div ref={sortRef} className="relative flex-1 max-w-[165px]">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="w-full h-9 px-3.5 rounded-full bg-[#F2F6F0] hover:bg-[#e9e8e5] text-[#181C1A] flex items-center justify-between gap-1 transition-colors border border-[#E2DED8]/70 cursor-pointer"
        >
          <span className="text-[11px] font-medium truncate text-[#5A615D]">
            Sort: <span className="font-bold text-[#181C1A]">{selectedSort.split(':')[0]}</span>
          </span>
          <svg
            className={`text-[#5A615D] transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {sortOpen && (
          <div className="absolute left-0 right-0 top-9 z-30 bg-white rounded-2xl shadow-xl p-1.5 flex flex-col gap-0.5 border border-[#E2DED8]">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onSelectSort(opt);
                  setSortOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-semibold flex items-center justify-between ${
                  selectedSort === opt
                    ? 'bg-[#EAF7D8] text-[#062402] font-bold'
                    : 'text-[#181C1A] hover:bg-[#F2F6F0]'
                }`}
              >
                <span>{opt}</span>
                {selectedSort === opt && (
                  <svg className="text-[#4b6723]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Grid vs List Layout Switcher */}
      <div className="flex items-center p-0.5 rounded-full bg-[#F2F6F0] border border-[#E2DED8]/60 shadow-inner">
        <button
          type="button"
          aria-label="2-Column Grid View"
          onClick={() => onChangeLayout('grid')}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            layout === 'grid'
              ? 'bg-white text-[#062402] shadow-sm font-bold'
              : 'text-[#5A615D] hover:text-[#181C1A]'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="1-Column List View"
          onClick={() => onChangeLayout('list')}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            layout === 'list'
              ? 'bg-white text-[#062402] shadow-sm font-bold'
              : 'text-[#5A615D] hover:text-[#181C1A]'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      </div>
    </section>
  );
}
