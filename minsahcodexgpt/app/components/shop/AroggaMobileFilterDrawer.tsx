'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, X, Search, ChevronRight } from 'lucide-react';
import type { FacetOption } from './AroggaFilterSidebar';

export interface AroggaMobileFilterDrawerProps {
  totalCount: number;
  inStockOnly: boolean;
  onInStockChange: (inStock: boolean | null) => void;
  priceMin: string;
  priceMax: string;
  onPriceChange: (min: string, max: string) => void;
  selectedDiscount: number | null;
  onDiscountChange: (discount: number | null) => void;
  categories: FacetOption[];
  selectedCategories: string[];
  onCategoryToggle: (slug: string) => void;
  onCategoryClear: () => void;
  brands: FacetOption[];
  selectedBrands: string[];
  onBrandToggle: (slug: string) => void;
  onBrandClear: () => void;
  skinTypes: FacetOption[];
  selectedSkinTypes: string[];
  onSkinTypeToggle: (slug: string) => void;
  onSkinTypeClear: () => void;
  skinConcerns: FacetOption[];
  selectedSkinConcerns: string[];
  onSkinConcernToggle: (slug: string) => void;
  onSkinConcernClear: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const PRESET_PRICES = [
  { label: 'Under ৳500', min: '', max: '500' },
  { label: '৳500 - ৳1,000', min: '500', max: '1000' },
  { label: '৳1,000 - ৳2,000', min: '1000', max: '2000' },
  { label: 'Over ৳2,000', min: '2000', max: '' },
];

const DISCOUNT_TIERS = [10, 20, 30, 40, 50];

export default function AroggaMobileFilterDrawer({
  totalCount,
  inStockOnly,
  onInStockChange,
  priceMin,
  priceMax,
  onPriceChange,
  selectedDiscount,
  onDiscountChange,
  categories,
  selectedCategories,
  onCategoryToggle,
  onCategoryClear,
  brands,
  selectedBrands,
  onBrandToggle,
  onBrandClear,
  skinTypes,
  selectedSkinTypes,
  onSkinTypeToggle,
  onSkinTypeClear,
  skinConcerns,
  selectedSkinConcerns,
  onSkinConcernToggle,
  onSkinConcernClear,
  onClearAll,
  hasActiveFilters,
  activeFilterCount,
}: AroggaMobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [customMin, setCustomMin] = useState(priceMin);
  const [customMax, setCustomMax] = useState(priceMax);

  // Sync min/max when props change
  useEffect(() => {
    setCustomMin(priceMin);
    setCustomMax(priceMax);
  }, [priceMin, priceMax]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.label.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [brands, brandSearch]);

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPriceChange(customMin.trim(), customMax.trim());
  };

  return (
    <>
      {/* Floating Filter Button (Arogga Style, positioned safely above bottom-navigation) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open filter drawer"
          className="flex items-center gap-2 rounded-full border border-stone-300 bg-white/95 px-5 py-2.5 text-sm font-bold text-[#1c3a13] shadow-lg backdrop-blur-md transition-transform active:scale-95"
        >
          <SlidersHorizontal size={16} className="text-[#1c3a13]" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1c3a13] px-1 text-[11px] font-bold text-white leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Slide-Up Bottom Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            className="relative z-10 flex flex-col w-full max-h-[88vh] rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#1c3a13]">Filter</span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close filters"
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Filter Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
              {/* 1. Availability */}
              <div className="border-b border-stone-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-stone-900">Availability</span>
                  {inStockOnly && (
                    <button
                      type="button"
                      onClick={() => onInStockChange(null)}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-stone-700">
                    <input
                      type="radio"
                      name="mobile_availability"
                      checked={inStockOnly}
                      onChange={() => onInStockChange(true)}
                      className="accent-[#1c3a13] h-4 w-4"
                    />
                    <span>In Stock</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-stone-700">
                    <input
                      type="radio"
                      name="mobile_availability"
                      checked={!inStockOnly}
                      onChange={() => onInStockChange(null)}
                      className="accent-[#1c3a13] h-4 w-4"
                    />
                    <span>All Products</span>
                  </label>
                </div>
              </div>

              {/* 2. Price Range */}
              <div className="border-b border-stone-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-stone-900">Price</span>
                  {(priceMin || priceMax) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMin('');
                        setCustomMax('');
                        onPriceChange('', '');
                      }}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2 mb-3">
                  {PRESET_PRICES.map((p) => {
                    const isSelected = priceMin === p.min && priceMax === p.max;
                    return (
                      <label key={p.label} className="flex items-center gap-2.5 cursor-pointer text-stone-700">
                        <input
                          type="radio"
                          name="mobile_price"
                          checked={isSelected}
                          onChange={() => {
                            setCustomMin(p.min);
                            setCustomMax(p.max);
                            onPriceChange(p.min, p.max);
                          }}
                          className="accent-[#1c3a13] h-4 w-4"
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
                <form onSubmit={handlePriceSubmit} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none"
                  />
                  <span className="text-stone-400">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={customMax}
                    onChange={(e) => setCustomMax(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Apply price"
                    className="flex h-9 w-10 items-center justify-center rounded-lg bg-[#1c3a13] text-white shrink-0"
                  >
                    <ChevronRight size={18} />
                  </button>
                </form>
              </div>

              {/* 3. Discount Range */}
              <div className="border-b border-stone-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-stone-900">Discount Range</span>
                  {selectedDiscount !== null && (
                    <button
                      type="button"
                      onClick={() => onDiscountChange(null)}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {DISCOUNT_TIERS.map((tier) => (
                    <label key={tier} className="flex items-center gap-2.5 cursor-pointer text-stone-700">
                      <input
                        type="radio"
                        name="mobile_discount"
                        checked={selectedDiscount === tier}
                        onChange={() => onDiscountChange(tier)}
                        className="accent-[#1c3a13] h-4 w-4"
                      />
                      <span>{tier}% and above</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Category */}
              {categories.length > 0 && (
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-stone-900">Category</span>
                    {selectedCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={onCategoryClear}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {categories.map((c) => {
                      const checked = selectedCategories.includes(c.slug);
                      return (
                        <label key={c.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700">
                          <div className="flex items-center gap-2.5 truncate">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onCategoryToggle(c.slug)}
                              className="accent-[#1c3a13] h-4 w-4 rounded"
                            />
                            <span className="truncate">{c.label}</span>
                          </div>
                          <span className="text-xs text-stone-400 tabular-nums">({c.count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Brand */}
              {brands.length > 0 && (
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-stone-900">Brand</span>
                    {selectedBrands.length > 0 && (
                      <button
                        type="button"
                        onClick={onBrandClear}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Search brands..."
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none"
                    />
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {filteredBrands.map((b) => {
                      const checked = selectedBrands.includes(b.slug);
                      return (
                        <label key={b.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700">
                          <div className="flex items-center gap-2.5 truncate">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onBrandToggle(b.slug)}
                              className="accent-[#1c3a13] h-4 w-4 rounded"
                            />
                            <span className="truncate">{b.label}</span>
                          </div>
                          <span className="text-xs text-stone-400 tabular-nums">({b.count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. Skin Concern */}
              {skinConcerns.length > 0 && (
                <div className="border-b border-stone-100 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-stone-900">Skin Concern</span>
                    {selectedSkinConcerns.length > 0 && (
                      <button
                        type="button"
                        onClick={onSkinConcernClear}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {skinConcerns.map((sc) => (
                      <label key={sc.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700">
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={selectedSkinConcerns.includes(sc.slug)}
                            onChange={() => onSkinConcernToggle(sc.slug)}
                            className="accent-[#1c3a13] h-4 w-4 rounded"
                          />
                          <span className="truncate">{sc.label}</span>
                        </div>
                        {sc.count > 0 && <span className="text-xs text-stone-400 tabular-nums">({sc.count})</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Skin Type */}
              {skinTypes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-stone-900">Skin Type</span>
                    {selectedSkinTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={onSkinTypeClear}
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {skinTypes.map((st) => (
                      <label key={st.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700">
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={selectedSkinTypes.includes(st.slug)}
                            onChange={() => onSkinTypeToggle(st.slug)}
                            className="accent-[#1c3a13] h-4 w-4 rounded"
                          />
                          <span className="truncate">{st.label}</span>
                        </div>
                        {st.count > 0 && <span className="text-xs text-stone-400 tabular-nums">({st.count})</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Apply Action */}
            <div className="border-t border-stone-200 bg-white p-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full h-12 rounded-full bg-[#1c3a13] text-white font-bold text-sm shadow-md active:scale-[0.99] transition-transform"
              >
                Show {totalCount} {totalCount === 1 ? 'Product' : 'Products'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
