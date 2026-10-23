'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { useFlashDealsTimer } from './useFlashDealsTimer';

interface FlashDealsCountdownPillProps {
  endsAt?: string | Date;
  label?: string;
  className?: string;
}

export default function FlashDealsCountdownPill({
  endsAt,
  label = 'OFFER CLOSES:',
  className = '',
}: FlashDealsCountdownPillProps) {
  const { formattedTime } = useFlashDealsTimer(endsAt);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#081F0E]/90 border border-emerald-600/40 backdrop-blur-md text-white shadow-inner select-none ${className}`}
      aria-label={`Offer ends in ${formattedTime}`}
    >
      <Clock className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
      <span className="text-[10px] sm:text-xs font-bold text-emerald-200/80 uppercase tracking-wider">
        {label}
      </span>
      <span className="font-mono text-xs sm:text-sm lg:text-base font-extrabold text-emerald-300 tracking-wider">
        {formattedTime}
      </span>
    </div>
  );
}
