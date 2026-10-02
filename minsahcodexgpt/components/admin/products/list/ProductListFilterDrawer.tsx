'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';

export const DEFAULT_PRODUCT_CATEGORIES = [
  'All Categories',
  'Make Up',
  'SPA',
  'Perfume',
  'Nails',
  'Skin care',
  'Hair care',
  'Combo',
];

export interface ProductListFilterDrawerProps {
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  categories?: string[];
}

export function ProductListFilterDrawer({
  category,
  onCategoryChange,
  status,
  onStatusChange,
  categories = DEFAULT_PRODUCT_CATEGORIES,
}: ProductListFilterDrawerProps) {
  return (
    <div className="mt-3 pt-3 border-t border-[#232636] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div>
        <label className="block text-[11px] font-medium text-white/50 mb-1">Category</label>
        <Select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full h-8 px-2.5 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-md text-xs"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-white/50 mb-1">Status</label>
        <Select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full h-8 px-2.5 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-md text-xs"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_stock">Out of Stock</option>
        </Select>
      </div>
    </div>
  );
}
