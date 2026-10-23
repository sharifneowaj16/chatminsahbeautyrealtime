'use client';

import React from 'react';
import Link from 'next/link';

export default function OrderSuccessHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#faf9f6]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe border-b border-[#E2DED8]/40">
      <div className="h-16 px-4 flex items-center justify-between">
        <Link
          href="/"
          aria-label="Home"
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#181C1A] hover:bg-[#F2F6F0] active:scale-95 transition-all"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>

        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-[17px] font-bold text-[#181C1A] tracking-tight leading-none font-sans">
            Order Confirmed
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723]" />
            <span className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider">
              Authenticated &amp; Sealed
            </span>
          </div>
        </div>

        <Link
          href="/account"
          aria-label="User Account"
          className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center flex-shrink-0 shadow-sm active:scale-95 transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
