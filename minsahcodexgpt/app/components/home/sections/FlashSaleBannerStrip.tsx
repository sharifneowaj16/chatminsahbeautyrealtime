'use client';

import type { ReactNode } from 'react';
import CountdownUrgencyBadge from './CountdownUrgencyBadge';

interface FlashSaleBannerStripProps {
  timer: ReactNode;
  urgencyText?: string;
  className?: string;
}

export default function FlashSaleBannerStrip({
  timer,
  urgencyText = 'Active limited-time offers only',
  className = '',
}: FlashSaleBannerStripProps) {
  return (
    <div
      className={`mb-6 flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-stone-200/80 bg-gradient-to-r from-orange-50/70 via-stone-50 to-[#FAF9F6] p-3 sm:p-4 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-3">
        {timer}
      </div>
      <CountdownUrgencyBadge text={urgencyText} />
    </div>
  );
}
