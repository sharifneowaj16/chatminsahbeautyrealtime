'use client';

import React, { useState } from 'react';

interface OrderCelebrationCardProps {
  orderNumber: string;
  customerName?: string;
}

export default function OrderCelebrationCard({
  orderNumber,
  customerName = 'Valued Customer',
}: OrderCelebrationCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="flex flex-col items-center text-center pt-2">
      {/* Radiant Animated Success Indicator */}
      <div className="relative flex items-center justify-center w-20 h-20 mb-4">
        <div className="absolute inset-0 rounded-full bg-[#EAF7D8] animate-ping opacity-60" />
        <div className="absolute inset-1 rounded-full bg-[#EAF7D8]" />
        <div className="relative w-14 h-14 rounded-full bg-[#062402] flex items-center justify-center shadow-lg shadow-[#062402]/20 text-[#c7edb5]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
      </div>

      {/* Micro Pill Status Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] mb-3 border border-[#ccee9b]/50">
        <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
        <span className="text-[11px] font-bold tracking-wide uppercase">
          Steadfast &amp; Pathao Express Sealed
        </span>
      </div>

      <h2 className="text-[22px] sm:text-[24px] font-bold text-[#181C1A] tracking-tight mb-2">
        Order Confirmed &amp; Sealed! ✨
      </h2>

      <p className="text-[13px] text-[#5A615D] max-w-sm px-2 leading-relaxed mb-4">
        Thank you, <span className="font-bold text-[#181C1A]">{customerName}</span>! Your order has been authenticated and queued for fast delivery via Pathao &amp; Steadfast Courier across Bangladesh.
      </p>

      {/* Copyable Order Token Pill */}
      <div className="flex items-center gap-2 bg-[#F2F6F0] py-1.5 px-4 rounded-full shadow-sm border border-[#E2DED8]/60">
        <span className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider">
          Order No.
        </span>
        <span className="text-[13px] text-[#062402] font-bold font-mono">
          {orderNumber}
        </span>
        <button
          type="button"
          aria-label="Copy order number"
          onClick={handleCopy}
          className="w-7 h-7 rounded-full bg-white text-[#062402] hover:bg-[#EAF7D8] transition-colors flex items-center justify-center ml-1 shadow-xs active:scale-90"
        >
          {copied ? (
            <svg className="text-[#4b6723]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
