'use client';

import React from 'react';
import { Search, Filter, Layers } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { clsx } from 'clsx';

export interface SortOption {
  value: string;
  label: string;
}

export const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'stock', label: 'Stock Level' },
  { value: 'created', label: 'Date Created' },
  { value: 'rating', label: 'Rating' },
];

export interface ProductListFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters?: boolean;
  sortOptions?: SortOption[];
}

export function ProductListFilterBar({
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters = false,
  sortOptions = DEFAULT_SORT_OPTIONS,
}: ProductListFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-2.5">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8.5 pl-9 pr-3 bg-[#10121b] border border-[#232636] text-[#F7F8F8] placeholder:text-white/35 rounded-lg text-xs focus:ring-1 focus:ring-white/20 focus:border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-all"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleFilters}
        className={clsx(
          'inline-flex items-center h-8.5 px-3 border rounded-lg text-xs font-medium transition-all duration-120 active:scale-[0.97]',
          showFilters || hasActiveFilters
            ? 'bg-[#5e6ad2] text-white border-[#5e6ad2] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
            : 'bg-[#10121b] border-[#232636] text-white/80 hover:text-white hover:bg-[#1b1e2c]'
        )}
      >
        <Filter className={clsx('w-3.5 h-3.5 mr-1.5', showFilters || hasActiveFilters ? 'text-white' : 'text-white/50')} />
        Filters
        {(showFilters || hasActiveFilters) && <Layers className="w-3.5 h-3.5 ml-1.5 text-white" />}
      </button>

      <Select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="h-8.5 px-3 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg text-xs font-medium focus:ring-1 focus:ring-white/20 focus:border-white/25"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
