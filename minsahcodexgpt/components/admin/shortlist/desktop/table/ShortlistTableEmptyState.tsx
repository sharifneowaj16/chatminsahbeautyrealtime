'use client';

import React from 'react';
import { PackageOpen, RefreshCw } from 'lucide-react';

interface ShortlistTableEmptyStateProps {
  onResetFilters?: () => void;
  onRefresh?: () => void;
}

export const ShortlistTableEmptyState: React.FC<ShortlistTableEmptyStateProps> = ({
  onResetFilters,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-[#142336] bg-[#071321] my-4 select-none">
      <div className="w-12 h-12 rounded-full bg-[#0d1d2e] border border-[#1a334d] flex items-center justify-center mb-3">
        <PackageOpen className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-white font-mono mb-1">
        No Sourcing SKUs Found
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4">
        All pending orders in this zone have been acquired or no unlisted items match your current filter query.
      </p>
      <div className="flex items-center gap-2">
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-md bg-[#0e1e32] hover:bg-[#152a45] border border-[#1b3452] text-xs font-mono text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Live Queue</span>
          </button>
        )}
      </div>
    </div>
  );
};
