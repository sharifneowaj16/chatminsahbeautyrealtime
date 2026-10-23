'use client';

import { ArrowRight } from 'lucide-react';

interface FilterStickyFooterProps {
  resultsCount: number;
  onClearAll: () => void;
  onApply: () => void;
}

export function FilterStickyFooter({
  resultsCount,
  onClearAll,
  onApply,
}: FilterStickyFooterProps) {
  return (
    <div className="p-4 border-t border-[#E2DED8]/60 bg-white/95 backdrop-blur-md flex items-center gap-3 shrink-0 pb-safe shadow-[0_-4px_20px_rgba(6,36,2,0.06)] relative z-20">
      <button
        type="button"
        onClick={onClearAll}
        className="px-4 py-3 rounded-full bg-[#efeeeb] text-[#1a1c1a] font-bold text-[13px] hover:bg-[#e3e2e0] transition-colors"
      >
        Clear All
      </button>

      <button
        type="button"
        onClick={onApply}
        className="flex-1 py-3 px-5 rounded-full bg-[#1c3a13] text-white font-bold text-[14px] shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <span>Show {resultsCount} Formulations</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
