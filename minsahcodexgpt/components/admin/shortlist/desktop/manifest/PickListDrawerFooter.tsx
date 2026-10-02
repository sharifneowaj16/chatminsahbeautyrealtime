'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface PickListDrawerFooterProps {
  totalUnits: number;
  totalCost: number;
  onMarkAcquired?: () => void;
  isProcessing?: boolean;
}

export const PickListDrawerFooter: React.FC<PickListDrawerFooterProps> = ({
  totalUnits,
  totalCost,
  onMarkAcquired,
  isProcessing = false,
}) => {
  return (
    <div className="p-4 border-t border-[#1b2537] bg-[#0c1322] flex items-center justify-between gap-4 font-mono select-none">
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
          Required Cash Float:
        </div>
        <div className="text-base font-extrabold text-emerald-400 flex items-center gap-1.5">
          <span>৳{totalCost.toLocaleString()}</span>
          <span className="text-[11px] text-slate-400 font-normal">
            ({totalUnits} Units)
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onMarkAcquired}
        disabled={isProcessing}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{isProcessing ? 'Syncing...' : 'Batch Acquire & Complete'}</span>
      </button>
    </div>
  );
};
