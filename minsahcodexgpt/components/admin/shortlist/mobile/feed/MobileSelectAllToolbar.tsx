// components/admin/shortlist/mobile/feed/MobileSelectAllToolbar.tsx
'use client';

import React from 'react';
import { CheckSquare, Square, Printer, CheckCheck } from 'lucide-react';

export interface MobileSelectAllToolbarProps {
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  selectedCount: number;
  totalCount: number;
  onPrintThermalSlip?: () => void;
  onBatchAcquire?: () => void;
}

export const MobileSelectAllToolbar: React.FC<MobileSelectAllToolbarProps> = ({
  isAllSelected,
  onToggleSelectAll,
  selectedCount,
  totalCount,
  onPrintThermalSlip,
  onBatchAcquire,
}) => {
  return (
    <div className="px-3.5 py-1.5 flex items-center justify-between font-mono text-xs text-slate-400 select-none">
      <button
        type="button"
        onClick={onToggleSelectAll}
        className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
      >
        {isAllSelected ? (
          <CheckSquare className="w-4 h-4 text-emerald-400" />
        ) : (
          <Square className="w-4 h-4 text-slate-500" />
        )}
        <span>Select All ({totalCount})</span>
      </button>

      <div className="flex items-center gap-2">
        {onPrintThermalSlip && (
          <button
            type="button"
            onClick={onPrintThermalSlip}
            className="h-7 px-2.5 rounded-md bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-95 border border-[#1f2f45] text-indigo-300 flex items-center gap-1 font-mono text-[11px] font-semibold transition-transform"
          >
            <Printer className="h-3 w-3" />
            <span>80mm</span>
          </button>
        )}

        {selectedCount > 0 && onBatchAcquire && (
          <button
            type="button"
            onClick={onBatchAcquire}
            className="h-7 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center gap-1 font-mono text-[11px] font-bold shadow-md shadow-emerald-600/20 transition-transform"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Acquire ({selectedCount})</span>
          </button>
        )}

        {selectedCount > 0 && !onBatchAcquire && (
          <span className="text-emerald-400 font-bold">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </span>
        )}
      </div>
    </div>
  );
};
export default MobileSelectAllToolbar;
