'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MobileVerticalScrollbarProps {
  progress?: number; // 0 to 100
  onScrollUp?: () => void;
  onScrollDown?: () => void;
  className?: string;
}

export default function MobileVerticalScrollbar({
  progress = 0,
  onScrollUp,
  onScrollDown,
  className = '',
}: MobileVerticalScrollbarProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={`w-3.5 flex flex-col items-center justify-between py-1 bg-emerald-950/70 border border-emerald-800/60 rounded-full select-none shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Up Arrow */}
      <button
        type="button"
        onClick={onScrollUp}
        aria-label="Scroll Up"
        className="text-emerald-400/80 hover:text-emerald-300 active:scale-90 transition-all p-0.5"
      >
        <ChevronUp className="w-2.5 h-2.5" />
      </button>

      {/* Track & Thumb */}
      <div className="relative flex-1 w-1.5 bg-emerald-900/60 rounded-full my-1 overflow-hidden">
        <div
          className="w-full bg-emerald-400/90 rounded-full transition-all duration-200"
          style={{
            height: '35%',
            transform: `translateY(${safeProgress * 0.65}%)`,
          }}
        />
      </div>

      {/* Down Arrow */}
      <button
        type="button"
        onClick={onScrollDown}
        aria-label="Scroll Down"
        className="text-emerald-400/80 hover:text-emerald-300 active:scale-90 transition-all p-0.5"
      >
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
