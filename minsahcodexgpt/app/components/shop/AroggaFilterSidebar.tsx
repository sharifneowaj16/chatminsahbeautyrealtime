'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';

export interface FacetOption {
  slug: string;
  label: string;
  count: number;
}

export interface AroggaFilterSidebarProps {
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
}

const PRESET_PRICES = [
  { label: 'Under ৳500', min: '', max: '500' },
  { label: '৳500 - ৳1,000', min: '500', max: '1000' },
  { label: '৳1,000 - ৳2,000', min: '1000', max: '2000' },
  { label: 'Over ৳2,000', min: '2000', max: '' },
];

const DISCOUNT_TIERS = [10, 20, 30, 40, 50];

export default function AroggaFilterSidebar({
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
}: AroggaFilterSidebarProps) {
  const [brandSearch, setBrandSearch] = useState('');
  const [customMin, setCustomMin] = useState(priceMin);
  const [customMax, setCustomMax] = useState(priceMax);

  // Filter brands by internal search query
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
    <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs font-sans text-xs sm:text-sm">
      {/* Top Header: Filters & Clear All */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
        <span className="font-bold text-[#1c3a13] text-base">Filters</span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* 1. Availability */}
      <div className="border-b border-stone-100 pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-stone-900">Availability</span>
          {inStockOnly && (
            <button
              type="button"
              onClick={() => onInStockChange(null)}
              className="text-[11px] font-medium text-rose-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
            <input
              type="radio"
              name="sidebar_availability"
              checked={inStockOnly}
              onChange={() => onInStockChange(true)}
              className="accent-[#1c3a13] h-4 w-4"
            />
            <span>In Stock</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
            <input
              type="radio"
              name="sidebar_availability"
              checked={!inStockOnly}
              onChange={() => onInStockChange(null)}
              className="accent-[#1c3a13] h-4 w-4"
            />
            <span>All Products (Including Out of Stock)</span>
          </label>
        </div>
      </div>

      {/* 2. Price Range */}
      <div className="border-b border-stone-100 pb-4 mb-4">
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
              className="text-[11px] font-medium text-rose-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Radio Ranges */}
        <div className="space-y-1.5 mb-3">
          {PRESET_PRICES.map((p) => {
            const isSelected = priceMin === p.min && priceMax === p.max;
            return (
              <label key={p.label} className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
                <input
                  type="radio"
                  name="sidebar_price"
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

        {/* Custom Min / Max inputs with apply button */}
        <form onSubmit={handlePriceSubmit} className="flex items-center gap-1.5 mt-2">
          <input
            type="number"
            placeholder="Min"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-20 rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none"
          />
          <span className="text-xs text-stone-400">to</span>
          <input
            type="number"
            placeholder="Max"
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            className="w-20 rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Apply price filter"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1c3a13] text-white hover:bg-[#15300f] transition-colors shrink-0"
          >
            <ChevronRight size={15} />
          </button>
        </form>
      </div>

      {/* 3. Discount Range */}
      <div className="border-b border-stone-100 pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-stone-900">Discount Range</span>
          {selectedDiscount !== null && (
            <button
              type="button"
              onClick={() => onDiscountChange(null)}
              className="text-[11px] font-medium text-rose-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {DISCOUNT_TIERS.map((tier) => (
            <label key={tier} className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
              <input
                type="radio"
                name="sidebar_discount"
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
        <div className="border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-stone-900">Category</span>
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={onCategoryClear}
                className="text-[11px] font-medium text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {categories.map((c) => {
              const checked = selectedCategories.includes(c.slug);
              return (
                <label key={c.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onCategoryToggle(c.slug)}
                      className="accent-[#1c3a13] h-4 w-4 rounded"
                    />
                    <span className="truncate">{c.label}</span>
                  </div>
                  <span className="text-[11px] text-stone-400 shrink-0 tabular-nums">({c.count})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Brand (With internal search) */}
      {brands.length > 0 && (
        <div className="border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-stone-900">Brand</span>
            {selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={onBrandClear}
                className="text-[11px] font-medium text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Internal Brand Search Field */}
          <div className="relative mb-2.5">
            <input
              type="text"
              placeholder="Search for brands..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-200 pl-7 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#1c3a13] focus:outline-none"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredBrands.length > 0 ? (
              filteredBrands.map((b) => {
                const checked = selectedBrands.includes(b.slug);
                return (
                  <label key={b.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onBrandToggle(b.slug)}
                        className="accent-[#1c3a13] h-4 w-4 rounded"
                      />
                      <span className="truncate">{b.label}</span>
                    </div>
                    <span className="text-[11px] text-stone-400 shrink-0 tabular-nums">({b.count})</span>
                  </label>
                );
              })
            ) : (
              <p className="text-xs text-stone-400 py-1 italic">No brands matching &quot;{brandSearch}&quot;</p>
            )}
          </div>
        </div>
      )}

      {/* 6. Skin Concern */}
      {skinConcerns.length > 0 && (
        <div className="border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-stone-900">Skin Concern</span>
            {selectedSkinConcerns.length > 0 && (
              <button
                type="button"
                onClick={onSkinConcernClear}
                className="text-[11px] font-medium text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {skinConcerns.map((sc) => {
              const checked = selectedSkinConcerns.includes(sc.slug);
              return (
                <label key={sc.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onSkinConcernToggle(sc.slug)}
                      className="accent-[#1c3a13] h-4 w-4 rounded"
                    />
                    <span className="truncate">{sc.label}</span>
                  </div>
                  {sc.count > 0 && <span className="text-[11px] text-stone-400 shrink-0 tabular-nums">({sc.count})</span>}
                </label>
              );
            })}
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
                className="text-[11px] font-medium text-rose-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {skinTypes.map((st) => {
              const checked = selectedSkinTypes.includes(st.slug);
              return (
                <label key={st.slug} className="flex items-center justify-between gap-2 cursor-pointer text-stone-700 hover:text-[#1c3a13]">
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onSkinTypeToggle(st.slug)}
                      className="accent-[#1c3a13] h-4 w-4 rounded"
                    />
                    <span className="truncate">{st.label}</span>
                  </div>
                  {st.count > 0 && <span className="text-[11px] text-stone-400 shrink-0 tabular-nums">({st.count})</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
