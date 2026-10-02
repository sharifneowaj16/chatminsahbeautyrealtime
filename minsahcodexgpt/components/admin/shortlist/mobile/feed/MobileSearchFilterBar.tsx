// components/admin/shortlist/mobile/feed/MobileSearchFilterBar.tsx
'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface MobileSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredCount?: number;
  filterCount?: number;
}

export const MobileSearchFilterBar: React.FC<MobileSearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  filteredCount,
  filterCount,
}) => {
  const count = filteredCount ?? filterCount ?? 0;

  return (
    <div className="px-3 pt-2">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder={`Search ${count} items by title, SKU, shade...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0a1727] border border-[#172a3e] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="w-4 h-4 text-slate-400 hover:text-white absolute right-3 top-2.5 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
export default MobileSearchFilterBar;
