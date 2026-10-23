'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface LocationSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export default function LocationSearchInput({
  value,
  onChange,
  onClear,
}: LocationSearchInputProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A615D]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search Dhaka area, road, or postal code..."
        className="w-full pl-10 pr-10 py-3 rounded-full bg-[#efeeeb] text-[#1a1c1a] placeholder:text-[#5A615D]/70 text-xs font-medium border border-[#E2DED8]/60 focus:outline-none focus:border-[#4b6723] transition-all shadow-inner"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5A615D] hover:text-[#062402] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
