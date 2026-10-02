'use client';

import React from 'react';
import { ShoppingCart, ListOrdered, Receipt, Check } from 'lucide-react';

interface MobileProductCardActionButtonsProps {
  isAcquired: boolean;
  orderCount: number;
  onAcquire: () => void;
  onOrdersDemand: () => void;
  onPrintSlip: () => void;
}

export const MobileProductCardActionButtons: React.FC<MobileProductCardActionButtonsProps> = ({
  isAcquired,
  orderCount,
  onAcquire,
  onOrdersDemand,
  onPrintSlip,
}) => {
  return (
    <div className="mt-3 pt-2.5 border-t border-[#172b40] flex items-center gap-2 select-none">
      <button
        type="button"
        onClick={onAcquire}
        className={`flex-1 py-1.5 px-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
          isAcquired
            ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }`}
      >
        {isAcquired ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Acquired ✓</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Acquire SKU</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onOrdersDemand}
        className="py-1.5 px-2.5 rounded-lg bg-[#0e1f32] hover:bg-[#152e4a] border border-[#1d3859] text-indigo-300 hover:text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        title="View Linked Customer Orders"
      >
        <ListOrdered className="w-3.5 h-3.5" />
        <span>{orderCount} Orders</span>
      </button>

      <button
        type="button"
        onClick={onPrintSlip}
        className="p-1.5 rounded-lg bg-[#0e1f32] hover:bg-[#152e4a] border border-[#1d3859] text-slate-400 hover:text-white transition-colors cursor-pointer"
        title="Print Single Slip"
      >
        <Receipt className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
