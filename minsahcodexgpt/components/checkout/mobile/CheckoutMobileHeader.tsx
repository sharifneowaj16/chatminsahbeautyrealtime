'use client';

import React from 'react';

interface CheckoutMobileHeaderProps {
  onBack: () => void;
  title?: string;
  stepInfo?: string;
}

export default function CheckoutMobileHeader({
  onBack,
  title = 'Payment & Order Review',
  stepInfo = 'Step 3 of 3: Payment & Order Review',
}: CheckoutMobileHeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#faf9f6]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
      <div className="h-20 px-6 flex items-center justify-between">
        <button
          type="button"
          aria-label="Go back"
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[#181C1A] hover:bg-[#F2F6F0] active:scale-95 transition-all"
          onClick={onBack}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#181C1A] tracking-tight leading-none font-sans">
            {title}
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4b6723]" />
            <span className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider">
              {stepInfo}
            </span>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(6,36,2,0.15)] text-white">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>
    </header>
  );
}
