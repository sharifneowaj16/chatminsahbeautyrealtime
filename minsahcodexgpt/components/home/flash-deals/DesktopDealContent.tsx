'use client';

import React from 'react';

interface DesktopDealContentProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function DesktopDealContent({
  title,
  subtitle,
  className = '',
}: DesktopDealContentProps) {
  return (
    <div className={`flex flex-col gap-0.5 mt-2.5 ${className}`}>
      <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1 tracking-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
}
