// components/admin/shortlist/desktop/table/ShortlistPaginationBar.tsx
'use client';

import React from 'react';

export interface ShortlistPaginationBarProps {
  currentPage: number;
  totalPages?: number;
  totalFilteredRows?: number;
  totalAllRows?: number;
  totalRows?: number;
  totalSkus?: number;
  isProcessing?: boolean;
  onPageChange: (page: number) => void;
}

export const ShortlistPaginationBar: React.FC<ShortlistPaginationBarProps> = ({
  currentPage,
  totalPages = 3,
  totalFilteredRows,
  totalAllRows,
  totalRows,
  totalSkus,
  isProcessing = false,
  onPageChange,
}) => {
  const allRows = totalAllRows ?? totalSkus ?? totalRows ?? 0;
  const filtered = totalFilteredRows ?? totalRows ?? allRows;

  return (
    <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-400 select-none">
      <p>
        Showing 1 - {filtered} of {allRows} SKUs •{' '}
        <span className="text-emerald-400 font-semibold">
          Scanner Rig 04 synced 2m ago
        </span>
        {isProcessing && (
          <span className="ml-2 text-indigo-400 animate-pulse font-bold">
            Syncing to database...
          </span>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="h-7 px-2.5 rounded bg-[#0a1727] border border-[#172a3e] text-slate-400 hover:text-white flex items-center gap-0.5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          ← Prev
        </button>

        {Array.from({ length: totalPages }).map((_, i) => {
          const pageNum = i + 1;
          const isActive = currentPage === pageNum;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`h-7 w-7 rounded flex items-center justify-center font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[#0a1727] hover:bg-[#122336] border border-[#172a3e] text-slate-300'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="h-7 px-2.5 rounded bg-[#0a1727] hover:bg-[#122336] border border-[#172a3e] text-slate-300 hover:text-white flex items-center gap-0.5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  );
};
export default ShortlistPaginationBar;
