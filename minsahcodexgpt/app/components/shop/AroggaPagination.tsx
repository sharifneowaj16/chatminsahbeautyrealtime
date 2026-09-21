'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface AroggaPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AroggaPagination({
  currentPage,
  totalPages,
  onPageChange,
}: AroggaPaginationProps) {
  if (totalPages <= 1) return null;

  // Generate pagination items with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Number of pages around current page

    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);

    if (left > 2) {
      pages.push('...');
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) {
      pages.push('...');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      className="mt-10 mb-6 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-sans"
      aria-label="Shop catalog pagination"
    >
      {/* Previous Button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
        className="flex h-9 sm:h-10 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 sm:px-3.5 font-medium text-stone-700 hover:border-[#1c3a13] hover:text-[#1c3a13] disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-stone-400 select-none">
                …
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Page ${pageNum}`}
              onClick={() => onPageChange(pageNum)}
              className={`flex h-9 sm:h-10 min-w-9 sm:min-w-10 items-center justify-center rounded-lg font-semibold transition-colors shadow-2xs ${
                isActive
                  ? 'bg-[#1c3a13] text-white border border-[#1c3a13]'
                  : 'border border-stone-200 bg-white text-stone-700 hover:border-[#1c3a13] hover:text-[#1c3a13]'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
        className="flex h-9 sm:h-10 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 sm:px-3.5 font-medium text-stone-700 hover:border-[#1c3a13] hover:text-[#1c3a13] disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
