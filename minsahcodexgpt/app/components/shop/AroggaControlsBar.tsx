'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LayoutGrid, List, Check } from 'lucide-react';
import type { SortOption } from '@/types/product';

export interface AroggaControlsBarProps {
  totalCount: number;
  query?: string;
  category?: string;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortOptions: Array<{ id: SortOption; label: string }>;
}

export default function AroggaControlsBar({
  totalCount,
  query,
  category,
  activeSort,
  onSortChange,
  viewMode,
  onViewModeChange,
  sortOptions,
}: AroggaControlsBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) {
        setViewOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortLabel = sortOptions.find((s) => s.id === activeSort)?.label || 'Relevance';

  return (
    <div className="mb-3 sm:mb-3.5 flex flex-row items-center justify-between gap-2 sm:gap-4 border-b border-stone-200/80 pb-2 sm:pb-2.5">
      {/* Result Headline */}
      <div className="min-w-0 flex-1">
        <h2 className="text-xs sm:text-lg font-bold text-[#1c3a13] tracking-tight truncate">
          {query
            ? `Showing all results for "${query}"`
            : category
            ? `Showing results in ${category}`
            : `Showing all formulations`}
        </h2>
        <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5 truncate">
          {totalCount} {totalCount === 1 ? 'product' : 'products'} available in stock
        </p>
      </div>

      {/* Controls: Sort Dropdown & View Dropdown (Inline on Mobile & Desktop) */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 text-xs sm:text-sm">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => {
              setSortOpen((v) => !v);
              setViewOpen(false);
            }}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-stone-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-stone-700 hover:border-[#1c3a13] hover:text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors shadow-2xs font-medium text-xs sm:text-sm"
          >
            <span className="text-stone-500 font-normal">Sort:</span>
            <span className="font-semibold text-[#1c3a13]">{currentSortLabel}</span>
            <ChevronDown size={14} className={`text-stone-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-stone-200 bg-white py-1.5 shadow-lg animate-in fade-in-50 zoom-in-95"
              role="listbox"
            >
              {sortOptions.map((opt) => {
                const isSelected = activeSort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSortChange(opt.id);
                      setSortOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs sm:text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#1c3a13]/10 font-bold text-[#1c3a13]'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} className="text-[#1c3a13]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View Switcher Dropdown (Arogga style) */}
        <div className="relative" ref={viewRef}>
          <button
            type="button"
            onClick={() => {
              setViewOpen((v) => !v);
              setSortOpen(false);
            }}
            aria-expanded={viewOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-stone-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-stone-700 hover:border-[#1c3a13] hover:text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors shadow-2xs font-medium text-xs sm:text-sm"
          >
            <span className="text-stone-500 font-normal">View:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#1c3a13]">
              {viewMode === 'grid' ? (
                <>
                  <LayoutGrid size={13} className="text-[#1c3a13]" /> Grid
                </>
              ) : (
                <>
                  <List size={13} className="text-[#1c3a13]" /> List
                </>
              )}
            </span>
            <ChevronDown size={14} className={`text-stone-400 transition-transform ${viewOpen ? 'rotate-180' : ''}`} />
          </button>

          {viewOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-30 w-36 rounded-xl border border-stone-200 bg-white py-1.5 shadow-lg animate-in fade-in-50 zoom-in-95"
              role="listbox"
            >
              <button
                type="button"
                role="option"
                aria-selected={viewMode === 'grid'}
                onClick={() => {
                  onViewModeChange('grid');
                  setViewOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs sm:text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#1c3a13]/10 font-bold text-[#1c3a13]'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutGrid size={15} /> Grid
                </span>
                {viewMode === 'grid' && <Check size={14} className="text-[#1c3a13]" />}
              </button>

              <button
                type="button"
                role="option"
                aria-selected={viewMode === 'list'}
                onClick={() => {
                  onViewModeChange('list');
                  setViewOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs sm:text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#1c3a13]/10 font-bold text-[#1c3a13]'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <List size={15} /> List
                </span>
                {viewMode === 'list' && <Check size={14} className="text-[#1c3a13]" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
