'use client';

import React from 'react';

interface PLPToastNotificationProps {
  message: string | null;
}

export default function PLPToastNotification({ message }: PLPToastNotificationProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      <div className="px-4 py-2.5 rounded-full bg-[#062402] text-white shadow-xl flex items-center gap-2 border border-[#1c3a13]">
        <svg className="text-[#ccee9b]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="text-[12px] font-semibold text-white whitespace-nowrap">
          {message}
        </span>
      </div>
    </div>
  );
}
