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
      className={`relative w-full rounded-2xl border border-stone-200 dark:border-[#23252a] bg-stone-50/90 dark:bg-[#0f1011]/90 shadow-sm transition-colors focus-within:border-stone-400 dark:focus-within:border-[#5e6ad2] focus-within:ring-2 focus-within:ring-stone-200 dark:focus-within:ring-[#5e6ad2]/20 overflow-hidden ${className}`}
    >
      {/* Linear Style Hairline Inner Accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-stone-300 dark:via-[#5e6ad2]/30 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};

export default LinearDarkSearchWrapper;

