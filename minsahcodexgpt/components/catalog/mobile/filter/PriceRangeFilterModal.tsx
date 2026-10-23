'use client';

import { useState } from 'react';
import {
  Sparkles,
  Layers,
  Store,
  Palette,
  Maximize2,
  FlaskConical,
} from 'lucide-react';
import { FilterHeader } from './FilterHeader';
import { PriceRangeSlider } from './PriceRangeSlider';
import { FilterDropdownSection } from './FilterDropdownSection';
import { FilterStickyFooter } from './FilterStickyFooter';
import { DetailedFilterState, PriceRangeFilterModalProps, FilterOption } from './types';

const CATEGORY_OPTIONS: FilterOption[] = [
  { id: 'sunscreen', label: 'Sunscreen & UV', count: 24 },
  { id: 'lipcare', label: 'Lip Care & Masks', count: 9 },
  { id: 'toners', label: 'Toners & Essences', count: 36 },
  { id: 'serums', label: 'Serums & Ampoules', count: 28 },
  { id: 'moisturizers', label: 'Moisturizers', count: 19 },
  { id: 'cleansers', label: 'Cleansers', count: 12 },
];

const BRAND_OPTIONS: FilterOption[] = [
  { id: 'anua', label: 'Anua', count: 14 },
  { id: 'laneige', label: 'Laneige', count: 18 },
  { id: 'boj', label: 'Beauty of Joseon', count: 12 },
  { id: 'cosrx', label: 'COSRX', count: 16 },
  { id: 'arisol', label: 'Arisol Lab', count: 8 },
  { id: 'skin1004', label: 'Skin1004', count: 11 },
  { id: 'torriden', label: 'Torriden', count: 7 },
  { id: 'roundlab', label: 'Round Lab', count: 10 },
];

const SHADE_OPTIONS: FilterOption[] = [
  { id: 'dewy', label: 'Natural Dewy / Clear', count: 48, colorHex: '#D4F6A2' },
  { id: 'berry', label: '01 Berry Glow', count: 16, colorHex: '#e15b82' },
  { id: 'coral', label: '02 Warm Coral', count: 11, colorHex: '#e88062' },
  { id: 'peach', label: 'Tone-Up Peach SPF', count: 15, colorHex: '#f3d9ce' },
  { id: 'matte', label: 'Matte Velvet Glass', count: 19, colorHex: '#ffffff' },
];

const SIZE_OPTIONS: FilterOption[] = [
  { id: 'travel', label: 'Travel (20–30ml)', count: 8, badge: 'Mini' },
  { id: 'standard', label: 'Standard (50–150ml)', count: 42 },
  { id: 'jumbo', label: 'Jumbo (250ml+)', count: 14, badge: 'Value' },
  { id: 'sets', label: 'Routine Set / Duos', count: 6, badge: 'Gift' },
];

const INGREDIENT_OPTIONS: FilterOption[] = [
  { id: 'heartleaf', label: 'Heartleaf 77%', count: 14, icon: 'eco' },
  { id: 'centella', label: 'Centella Asiatica (Cica)', count: 22, icon: 'eco' },
  { id: 'snail', label: 'Snail Mucin 96%', count: 8, icon: 'water_drop' },
  { id: 'niacinamide', label: 'Niacinamide + Zinc', count: 19, icon: 'biotech' },
  { id: 'probiotics', label: 'Fermented Probiotics', count: 11, icon: 'spa' },
  { id: 'rice', label: 'Rice Bran Extract', count: 15, icon: 'grain' },
];

export function PriceRangeFilterModal({
  isOpen,
  onClose,
  filters: initialFilters,
  onApply,
  totalResultsCount = 68,
}: PriceRangeFilterModalProps) {
  const [filters, setFilters] = useState<DetailedFilterState>(initialFilters);

  if (!isOpen) return null;

  const handlePriceChange = (min: number, max: number) => {
    setFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }));
  };

  const toggleItem = (key: keyof Omit<DetailedFilterState, 'minPrice' | 'maxPrice'>, id: string) => {
    setFilters((prev) => {
      const currentList = prev[key];
      const nextList = currentList.includes(id)
        ? currentList.filter((x) => x !== id)
        : [...currentList, id];
      return { ...prev, [key]: nextList };
    });
  };

  const handleReset = () => {
    setFilters({
      minPrice: 500,
      maxPrice: 5000,
      categories: [],
      brands: [],
      shades: [],
      sizes: [],
      ingredients: [],
    });
  };

  const activeCount =
    (filters.minPrice > 500 || filters.maxPrice < 5000 ? 1 : 0) +
    filters.categories.length +
    filters.brands.length +
    filters.shades.length +
    filters.sizes.length +
    filters.ingredients.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#062402]/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in">
      <div
        className="w-full max-w-lg bg-[#faf9f6] rounded-t-[32px] shadow-2xl flex flex-col max-h-[88vh] h-[88vh] overflow-hidden border-t border-[#E2DED8]/60 relative animate-in slide-in-from-bottom-8 duration-300"
      >
        {/* Header */}
        <FilterHeader
          onReset={handleReset}
          onClose={onClose}
          activeCount={activeCount}
        />

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 flex flex-col gap-4 overscroll-contain">
          {/* Price Range Dual Slider */}
          <PriceRangeSlider
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onChange={handlePriceChange}
          />

          {/* Categories */}
          <FilterDropdownSection
            title="Categories"
            icon={<Layers className="w-3.5 h-3.5 text-[#4b6723]" />}
            options={CATEGORY_OPTIONS}
            selectedIds={filters.categories}
            onToggle={(id) => toggleItem('categories', id)}
            dropdownPlaceholder="Select Categories"
          />

          {/* Brands */}
          <FilterDropdownSection
            title="Brands"
            icon={<Store className="w-3.5 h-3.5 text-[#4b6723]" />}
            options={BRAND_OPTIONS}
            selectedIds={filters.brands}
            onToggle={(id) => toggleItem('brands', id)}
            dropdownPlaceholder="Select Brands"
          />

          {/* Shades & Finishes */}
          <FilterDropdownSection
            title="Shades & Finishes"
            icon={<Palette className="w-3.5 h-3.5 text-[#4b6723]" />}
            options={SHADE_OPTIONS}
            selectedIds={filters.shades}
            onToggle={(id) => toggleItem('shades', id)}
            dropdownPlaceholder="Select Shades & Finishes"
          />

          {/* Size & Volume */}
          <FilterDropdownSection
            title="Size & Volume"
            icon={<Maximize2 className="w-3.5 h-3.5 text-[#4b6723]" />}
            options={SIZE_OPTIONS}
            selectedIds={filters.sizes}
            onToggle={(id) => toggleItem('sizes', id)}
            dropdownPlaceholder="Select Size & Volume"
          />

          {/* Key Active Ingredients */}
          <FilterDropdownSection
            title="Key Active Ingredients"
            icon={<FlaskConical className="w-3.5 h-3.5 text-[#4b6723]" />}
            options={INGREDIENT_OPTIONS}
            selectedIds={filters.ingredients}
            onToggle={(id) => toggleItem('ingredients', id)}
            dropdownPlaceholder="Select Active Ingredients"
          />
        </div>

        {/* Sticky Action Footer */}
        <FilterStickyFooter
          resultsCount={totalResultsCount}
          onClearAll={handleReset}
          onApply={() => {
            onApply(filters);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
