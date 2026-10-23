'use client';

import React from 'react';

export default function CheckoutTrustBadges() {
  return (
    <div className="flex flex-col gap-3">
      {/* 3-Col Guarantee Mosaic */}
      <div className="grid grid-cols-3 gap-2 pb-1">
        {/* Badge 1 */}
        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-1.5">
          <div className="w-8 h-8 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#4b6723]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#181C1A]">
            100% Genuine
          </span>
          <span className="text-[10px] text-[#5A615D] leading-tight">
            Worldwide Import
          </span>
        </div>

        {/* Badge 2 */}
        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-1.5">
          <div className="w-8 h-8 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#4b6723]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#181C1A]">
            Hologram Seal
          </span>
          <span className="text-[10px] text-[#5A615D] leading-tight">
            Tamper QR Guard
          </span>
        </div>

        {/* Badge 3 */}
        <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-1.5">
          <div className="w-8 h-8 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#4b6723]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
          <span className="text-[12px] font-bold text-[#181C1A]">
            14-Day Return
          </span>
          <span className="text-[10px] text-[#5A615D] leading-tight">
            No Hassle Exchange
          </span>
        </div>
      </div>

      {/* Policy Consent Footnote */}
      <div className="flex items-center justify-center gap-1.5 text-center px-4 py-1 text-[#5A615D]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-[11px] leading-tight">
          By clicking place order, you accept the Minsah Authentic Import &amp; Return Policy.
        </p>
      </div>
    </div>
  );
}
