'use client';

import React from 'react';
import { ShoppingBag, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface ShortlistBulkSourcingBarProps {
  totalCount: number;
  selectedCount: number;
  selectedUnits: number;
  selectedCost: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onOpenPickList: () => void;
  onMarkBatchAcquired: () => void;
}

export const ShortlistBulkSourcingBar: React.FC<ShortlistBulkSourcingBarProps> = ({
  totalCount,
  selectedCount,
  selectedUnits,
  selectedCost,
  isAllSelected,
  onToggleSelectAll,
  onOpenPickList,
  onMarkBatchAcquired,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg bg-[#071321] border border-[#142336] shadow-sm select-none">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-slate-300">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded bg-[#0a1727] border-[#182a3d] text-indigo-600 focus:ring-0 cursor-pointer"
          />
          <span className="font-semibold">Select All ({totalCount})</span>
        </label>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#192b42] text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-bold">
              {selectedCount} SKUs Selected
            </span>
            <span className="text-slate-400">
              ({selectedUnits} Units • Total Float: <strong className="text-emerald-400">৳{selectedCost.toLocaleString()}</strong>)
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPickList}
          disabled={selectedCount === 0}
          className="px-3 py-1.5 rounded-md bg-[#0e1e32] hover:bg-[#152a45] border border-[#1b3452] text-xs font-mono font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
          <span>Open Walking Manifest</span>
        </button>

        <button
          type="button"
          onClick={onMarkBatchAcquired}
          disabled={selectedCount === 0}
          className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Batch Acquire ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
};
