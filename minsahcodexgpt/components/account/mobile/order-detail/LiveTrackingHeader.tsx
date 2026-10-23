'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Headphones } from 'lucide-react';

interface LiveTrackingHeaderProps {
  orderNumber: string;
  onOpenConcierge?: () => void;
}

export default function LiveTrackingHeader({
  orderNumber,
  onOpenConcierge,
}: LiveTrackingHeaderProps) {
  return (
    <div className="px-4 pt-3 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/account/orders"
          aria-label="Go back to orders"
          className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#1a1c1a] hover:text-[#062402] active:scale-90 transition-all shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[18px] font-bold text-[#062402] font-sans">Track Shipment</span>
            <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold tracking-tight">
              Express
            </span>
          </div>
          <span className="text-[11px] text-[#43483f] font-medium">{orderNumber}</span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Order support"
        onClick={onOpenConcierge}
        className="w-9 h-9 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#4b6723] hover:text-[#062402] active:scale-95 transition-all shadow-xs"
      >
        <Headphones className="w-4 h-4" />
      </button>
    </div>
  );
}
