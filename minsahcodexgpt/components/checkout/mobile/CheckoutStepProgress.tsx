'use client';

import React from 'react';

export default function CheckoutStepProgress() {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Step 1: Bag */}
          <span className="w-6 h-6 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center text-[12px] font-bold">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[12px] font-bold text-[#5A615D] line-through opacity-70">
            Bag
          </span>

          <span className="w-3.5 sm:w-4 h-0.5 bg-[#E2DED8] rounded-full" />

          {/* Step 2: Address */}
          <span className="w-6 h-6 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center text-[12px] font-bold">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[12px] font-bold text-[#5A615D] line-through opacity-70">
            Address
          </span>

          <span className="w-3.5 sm:w-4 h-0.5 bg-[#4b6723] rounded-full" />

          {/* Step 3: Payment */}
          <span className="w-6 h-6 rounded-full bg-[#062402] text-white flex items-center justify-center text-[12px] font-bold shadow-sm">
            3
          </span>
          <span className="text-[12px] font-bold text-[#181C1A]">
            Payment
          </span>
        </div>

        {/* Security Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] border border-[#B5C4BB]/30">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
            100% Authentic Import
          </span>
        </div>
      </div>
    </div>
  );
}
