'use client';

import React from 'react';

interface SearchWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const RoyalForestSearchWrapper: React.FC<SearchWrapperProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`relative w-full rounded-2xl border-2 border-white/20 dark:border-[#1c3a13]/80 bg-[#122416]/90 dark:bg-[#0c130b] shadow-sm transition-colors focus-within:border-[#D4F6A2] dark:focus-within:border-[#27a644] focus-within:ring-2 focus-within:ring-[#D4F6A2]/20 overflow-hidden ${className}`}
    >
      {/* Luxury Champagne Gold Micro Accent */}
      <div className="absolute top-0 right-3 flex items-center gap-1 pointer-events-none pt-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
      </div>
      {children}
    </div>
  );
};

export default RoyalForestSearchWrapper;

