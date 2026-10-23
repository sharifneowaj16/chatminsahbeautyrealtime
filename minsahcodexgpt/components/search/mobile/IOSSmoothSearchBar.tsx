"use client";

import React, { useRef, useEffect } from "react";

interface IOSSmoothSearchBarProps {
  query: string;
  onChangeQuery: (val: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export function IOSSmoothSearchBar({
  query,
  onChangeQuery,
  onClear,
  onCancel,
  onSubmit,
}: IOSSmoothSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto focus when search bar opens
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-16 px-4 flex items-center gap-2.5 bg-[#FAF9F6]/95 backdrop-blur-2xl border-b border-[#E2DED8]/60 shadow-xs z-50">
      <form onSubmit={onSubmit} className="flex-1 relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-[#4b6723] pointer-events-none transition-transform duration-300">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          aria-label="Search catalog input"
          autoComplete="off"
          placeholder="Search 100% authentic K-Beauty..."
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] placeholder:text-[#43483f]/70 text-xs font-medium border border-[#E2DED8]/50 focus:outline-none focus:border-[#4b6723] focus:ring-2 focus:ring-[#4b6723]/20 shadow-inner transition-all duration-200"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={onClear}
            className="material-symbols-outlined absolute right-3 text-[16px] text-[#43483f] hover:text-[#062402] transition-colors cursor-pointer"
          >
            cancel
          </button>
        )}
      </form>

      <button
        type="button"
        aria-label="Cancel search"
        onClick={onCancel}
        className="text-xs font-semibold text-[#4b6723] hover:text-[#062402] active:scale-95 px-2 py-1.5 transition-all cursor-pointer shrink-0"
      >
        Cancel
      </button>
    </div>
  );
}
