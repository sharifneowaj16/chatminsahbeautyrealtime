'use client';

import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface LocationModalHeaderProps {
  onClose: () => void;
}

export default function LocationModalHeader({ onClose }: LocationModalHeaderProps) {
  return (
    <div className="flex items-start justify-between pb-3 border-b border-[#E2DED8]/60">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
          <span className="text-[10px] uppercase tracking-wider font-bold">
            Steadfast &amp; Pathao Express
          </span>
        </div>
        <h3 className="text-[18px] text-[#062402] font-bold tracking-tight mt-0.5">
          Select Delivery Location
        </h3>
        <p className="text-[11px] text-[#5A615D] font-medium">
          Fast doorstep delivery across all 64 districts in Bangladesh
        </p>
      </div>
      <button
        type="button"
        aria-label="Close location selector"
        onClick={onClose}
        className="w-9 h-9 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#5A615D] hover:text-[#062402] active:scale-95 transition-all cursor-pointer shrink-0 shadow-sm"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
