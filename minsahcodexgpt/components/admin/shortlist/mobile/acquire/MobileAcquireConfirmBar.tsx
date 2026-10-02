// components/admin/shortlist/mobile/acquire/MobileAcquireConfirmBar.tsx
'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export interface MobileAcquireConfirmBarProps {
  totalOutflow: number;
  totalProfitEstimate?: number;
  acquireQty: number;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const MobileAcquireConfirmBar: React.FC<MobileAcquireConfirmBarProps> = ({
  totalOutflow,
  totalProfitEstimate = 0,
  acquireQty,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="p-4 bg-[#0a1727] border-t border-[#1c2b3c] flex flex-col gap-2 shrink-0 select-none shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col font-mono">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Total Float Outflow:
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-emerald-400">
              {formatPrice(totalOutflow)}
            </span>
            <span className="text-xs text-slate-400">({acquireQty} pcs)</span>
          </div>
          {totalProfitEstimate > 0 && (
            <span className="text-[10px] text-emerald-400">
              Est. Profit: {formatPrice(totalProfitEstimate)}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={isSubmitting || acquireQty <= 0}
          onClick={onConfirm}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{isSubmitting ? 'Logging...' : 'Confirm Acquisition'}</span>
        </button>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-1 text-slate-400 hover:text-white text-xs font-semibold transition"
        >
          Cancel / Keep in Shortlist
        </button>
      )}
    </div>
  );
};
export default MobileAcquireConfirmBar;
