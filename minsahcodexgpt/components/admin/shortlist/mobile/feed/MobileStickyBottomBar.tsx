// components/admin/shortlist/mobile/feed/MobileStickyBottomBar.tsx
'use client';

import React from 'react';
import { ShoppingCart, Printer } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export interface MobileStickyBottomBarProps {
  selectedCount: number;
  selectedCost?: number;
  onBatchAcquire: () => void;
  onPrintThermalSlip?: () => void;
  onPrintSlip?: () => void;
}

export const MobileStickyBottomBar: React.FC<MobileStickyBottomBarProps> = ({
  selectedCount,
  selectedCost = 0,
  onBatchAcquire,
  onPrintThermalSlip,
  onPrintSlip,
}) => {
  const handlePrint = onPrintSlip || onPrintThermalSlip;

  if (selectedCount === 0) {
    return (
      <aside className="sticky bottom-0 z-30 bg-[#071321]/95 backdrop-blur-md border-t border-[#142337] px-3.5 py-2.5 flex items-center justify-between select-none">
        <span className="text-xs font-mono text-slate-400">
          Tap items to select &amp; batch acquire
        </span>
      </aside>
    );
  }

  return (
    <aside className="sticky bottom-0 z-30 bg-[#071321]/95 backdrop-blur-md border-t border-[#142337] px-3.5 py-2.5 flex items-center justify-between gap-3 select-none shadow-2xl">
      <div className="flex flex-col font-mono">
        <span className="text-xs font-bold text-white">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </span>
        {selectedCost > 0 && (
          <span className="text-[10px] text-emerald-400">
            Total: {formatPrice(selectedCost)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {handlePrint && (
          <button
            type="button"
            onClick={handlePrint}
            className="p-2.5 rounded-xl bg-[#0f243a] hover:bg-[#153454] border border-[#1d3d63] text-indigo-300 hover:text-white transition cursor-pointer"
            aria-label="Print Thermal Slip"
          >
            <Printer className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onBatchAcquire}
          className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Batch Acquire</span>
        </button>
      </div>
    </aside>
  );
};
export default MobileStickyBottomBar;
