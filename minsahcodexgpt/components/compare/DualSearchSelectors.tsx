'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface DualSearchSelectorsProps {
  leftQuery: string;
  rightQuery: string;
  onLeftChange: (val: string) => void;
  onRightChange: (val: string) => void;
  onLeftOpen?: () => void;
  onRightOpen?: () => void;
}

export default function DualSearchSelectors({
  leftQuery,
  rightQuery,
  onLeftChange,
  onRightChange,
  onLeftOpen,
  onRightOpen,
}: DualSearchSelectorsProps) {
  return (
    <div className="px-4 pb-2.5 grid grid-cols-2 gap-2">
      {/* Left Search Selector */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-[#5A615D] absolute left-2.5 pointer-events-none" />
        <input
          aria-label="Search left product"
          type="text"
          value={leftQuery}
          onChange={(e) => onLeftChange(e.target.value)}
          placeholder="Change left product..."
          className="w-full pl-7 pr-6 py-1.5 rounded-full bg-[#F2F6F0] text-[#1a1c1a] placeholder:text-[#5A615D]/70 text-[11px] border border-[#E2DED8] focus:outline-none focus:ring-1 focus:ring-[#062402] shadow-sm"
        />
        <button
          type="button"
          onClick={onLeftOpen}
          className="absolute right-2 text-[#5A615D] hover:text-[#062402]"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Search Selector */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-[#5A615D] absolute left-2.5 pointer-events-none" />
        <input
          aria-label="Search right product"
          type="text"
          value={rightQuery}
          onChange={(e) => onRightChange(e.target.value)}
          placeholder="Change right product..."
          className="w-full pl-7 pr-6 py-1.5 rounded-full bg-[#F2F6F0] text-[#1a1c1a] placeholder:text-[#5A615D]/70 text-[11px] border border-[#E2DED8] focus:outline-none focus:ring-1 focus:ring-[#062402] shadow-sm"
        />
        <button
          type="button"
          onClick={onRightOpen}
          className="absolute right-2 text-[#5A615D] hover:text-[#062402]"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
