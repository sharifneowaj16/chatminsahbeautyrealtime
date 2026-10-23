'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface OrderHistorySearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  isVisible: boolean;
}

export default function OrderHistorySearchBar({
  value,
  onChange,
  onClear,
  isVisible,
}: OrderHistorySearchBarProps) {
  if (!isVisible) return null;

  return (
    <div className="px-4 pb-3 transition-all duration-300">
      <div className="relative w-full flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-[#43483f]/70 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by Order ID or Product name..."
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] placeholder:text-[#43483f]/70 text-xs font-medium focus:outline-none focus:bg-white shadow-sm transition-all"
        />
        {value.trim().length > 0 && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={onClear}
            className="absolute right-3 w-5 h-5 flex items-center justify-center text-[#43483f]/70 hover:text-[#062402]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
