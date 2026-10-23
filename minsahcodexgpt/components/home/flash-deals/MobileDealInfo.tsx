'use client';

import React from 'react';

interface MobileDealInfoProps {
  title: string;
  subtitle?: string;
  urgencyText?: string;
  className?: string;
}

export default function MobileDealInfo({
  title,
  subtitle,
  urgencyText,
  className = '',
}: MobileDealInfoProps) {
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${className}`}>
      {/* Urgency Line */}
      {urgencyText && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 animate-pulse" />
          <span className="truncate">{urgencyText}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate">
        {title}
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
