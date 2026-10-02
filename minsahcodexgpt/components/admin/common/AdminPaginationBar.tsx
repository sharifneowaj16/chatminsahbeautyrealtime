'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface AdminPaginationBarProps {
  page: number;
  limit: number;
  total: number;
  pages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  limitOptions?: number[];
  disabled?: boolean;
  className?: string;
}

export const AdminPaginationBar: React.FC<AdminPaginationBarProps> = ({
  page,
  limit,
  total,
  pages,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  disabled = false,
  className = '',
}) => {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const totalPages = Math.max(1, pages || Math.ceil(total / limit) || 1);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const delta = 1;
    const range: number[] = [];
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift(-1); // ellipsis
    }
    if (page + delta < totalPages - 1) {
      range.push(-2); // ellipsis
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-slate-800 bg-slate-900/40 rounded-b-xl ${className}`}
    >
      {/* Range and Total */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>
          Showing <span className="font-semibold text-slate-200">{from}</span> to{' '}
          <span className="font-semibold text-slate-200">{to}</span> of{' '}
          <span className="font-semibold text-slate-200">{total}</span> items
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <span>Per page:</span>
            <select
              value={limit}
              disabled={disabled}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Items per page"
              className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(1)}
          className="h-8 w-8 p-0 border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 p-0 border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Numbered Page Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p < 0) {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-600">
                  ...
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 p-0 border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-8 w-8 p-0 border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default AdminPaginationBar;
