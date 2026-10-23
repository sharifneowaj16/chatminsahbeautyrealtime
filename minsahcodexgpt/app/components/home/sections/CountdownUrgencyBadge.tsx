'use client';

import { TimerReset } from 'lucide-react';

interface CountdownUrgencyBadgeProps {
  text?: string;
  className?: string;
}

export default function CountdownUrgencyBadge({
  text = 'Active limited-time offers only',
  className = '',
}: CountdownUrgencyBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-orange-200/90 bg-white/90 px-3 py-1 text-[11px] font-bold text-orange-700 shadow-2xs backdrop-blur-xs ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
      </span>
      <TimerReset size={13} className="shrink-0 text-orange-600" aria-hidden="true" />
      <span className="tracking-tight">{text}</span>
    </div>
  );
}
