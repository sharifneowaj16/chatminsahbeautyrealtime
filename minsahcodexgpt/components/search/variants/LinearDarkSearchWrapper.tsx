'use client';

import React from 'react';

interface SearchWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const LinearDarkSearchWrapper: React.FC<SearchWrapperProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`relative w-full rounded-2xl border border-white/20 dark:border-white/15 bg-[#122416]/90 dark:bg-[#0f1011]/90 backdrop-blur-md shadow-sm transition-colors focus-within:border-[#D4F6A2] dark:focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-[#D4F6A2]/25 overflow-hidden ${className}`}
    >
      {/* Linear Style Hairline Inner Accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4F6A2]/30 dark:via-emerald-400/30 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};

export default LinearDarkSearchWrapper;

