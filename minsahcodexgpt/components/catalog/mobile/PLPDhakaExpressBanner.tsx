'use client';

import React from 'react';

export default function PLPDhakaExpressBanner() {
  return (
    <aside
      aria-label="Delivery announcement"
      className="w-full bg-[#EAF7D8] px-4 py-2 flex items-center justify-between text-[#1c3a13] border-b border-[#ccee9b]/50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="text-[#4b6723] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <p className="text-[11px] sm:text-[12px] font-bold truncate">
          Dhaka Express: Order before 3 PM for{' '}
          <span className="underline decoration-[#4b6723] font-extrabold">Same-Day Dispatch</span> in Gulshan &amp; Banani
        </p>
      </div>

      <svg className="text-[#4b6723] shrink-0 opacity-85 ml-1" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </aside>
  );
}
