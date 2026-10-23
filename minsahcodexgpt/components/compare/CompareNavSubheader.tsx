'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';

interface CompareNavSubheaderProps {
  onSwap: () => void;
}

export default function CompareNavSubheader({ onSwap }: CompareNavSubheaderProps) {
  return (
    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
      <Link
        href="/categories"
        className="flex items-center gap-1.5 text-[#1a1c1a] hover:text-[#062402] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-[12px] uppercase font-bold tracking-wider text-[#062402]">
          Compare Formulations
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSwap}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F6F0] text-[#5A615D] font-bold text-[11px] shadow-sm hover:bg-[#e9e8e5] transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#4b6723]" />
          <span>Swap Items</span>
        </button>
      </div>
    </div>
  );
}
