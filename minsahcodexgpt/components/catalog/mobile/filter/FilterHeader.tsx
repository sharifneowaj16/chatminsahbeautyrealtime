'use client';

import { X, SlidersHorizontal } from 'lucide-react';

interface FilterHeaderProps {
  onReset: () => void;
  onClose: () => void;
  activeCount: number;
}

export function FilterHeader({ onReset, onClose, activeCount }: FilterHeaderProps) {
  return (
    <div className="flex flex-col shrink-0">
      {/* iOS drag indicator */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-[#B5C4BB]/60" />
      </div>

      <div className="px-4 py-3 border-b border-[#E2DED8]/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#062402]" />
          <span className="text-[18px] text-[#062402] font-bold">
            Filters &amp; Sort
          </span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#062402] text-white text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="text-[#4b6723] text-[12px] font-semibold hover:underline px-2 py-1"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#1a1c1a] hover:bg-[#E8F0E5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
