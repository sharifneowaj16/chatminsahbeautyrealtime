// app/admin/shortlist/components/BulkSourcingBar.tsx
// Floating Batch Sourcing Toolbar matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)

'use client';

import React from 'react';

interface BulkSourcingBarProps {
  totalCount: number;
  selectedCount: number;
  selectedUnits: number;
  selectedCost: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onOpenPickList: () => void;
  onMarkBatchAcquired: () => void;
}

export default function BulkSourcingBar({
  totalCount,
  selectedCount,
  selectedUnits,
  selectedCost,
  isAllSelected,
  onToggleSelectAll,
  onOpenPickList,
  onMarkBatchAcquired,
}: BulkSourcingBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-[#0a1727] border border-[#192b42] shadow-sm">
      {/* Left selection counter */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            id="select-all"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="h-3.5 w-3.5 rounded border-[#243954] bg-[#071321] text-indigo-600 focus:ring-0 focus:ring-offset-0 transition-colors accent-indigo-600"
          />
          <span className="text-xs font-mono font-medium text-slate-300">
            Select All ({totalCount})
          </span>
        </label>
        <div className="h-3.5 w-px bg-[#1d304a]"></div>
        <p className="text-xs font-mono text-slate-400">
          <span className="text-slate-200 font-semibold">
            Selected: {selectedCount} SKUs
          </span>
          <span className="text-slate-500"> ({selectedUnits} Units · Cost: </span>
          <span className="text-emerald-400 font-bold">
            ৳{selectedCost.toLocaleString()}
          </span>
          <span className="text-slate-500">)</span>
        </p>
      </div>

      {/* Right action triggers */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="open-pick-list-btn"
          onClick={onOpenPickList}
          className="px-2.5 py-1 rounded-md bg-[#0e2136] hover:bg-[#153150] border border-[#1e3b5e] text-slate-200 text-[11px] font-semibold font-mono flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group cursor-pointer"
          title="Open Wholesale Pick List Manifest (Batch #PL-84920)"
        >
          <span className="text-indigo-400 group-hover:text-indigo-300 text-sm">🖨️</span>
          <span>Print Pick List</span>
        </button>

        <button
          type="button"
          onClick={onMarkBatchAcquired}
          className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold font-mono flex items-center gap-1 shadow-sm transition-colors cursor-pointer active:scale-95"
          title="Mark selected batch as acquired"
        >
          <span className="text-xs">✓✓</span>
          <span>Mark Batch Acquired</span>
        </button>
      </div>
    </div>
  );
}
