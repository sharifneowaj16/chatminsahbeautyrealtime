'use client';

import React from 'react';

interface DesktopDealProgressBarProps {
  percentage?: number;
  className?: string;
}

export default function DesktopDealProgressBar({
  percentage = 85,
  className = '',
}: DesktopDealProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percentage));
  const isHighUrgency = safePercent >= 90;

  return (
    <div
      className={`h-1.5 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mt-1 ${className}`}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          isHighUrgency ? 'bg-red-600' : 'bg-emerald-600'
        }`}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}
