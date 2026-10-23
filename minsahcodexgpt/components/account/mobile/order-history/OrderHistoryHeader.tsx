'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, SlidersHorizontal, ShieldCheck } from 'lucide-react';

interface OrderHistoryHeaderProps {
  activeCount: number;
  deliveredCount: number;
  onToggleFilterSearch?: () => void;
  onOpenVault?: () => void;
}

export default function OrderHistoryHeader({
  activeCount,
  deliveredCount,
  onToggleFilterSearch,
  onOpenVault,
}: OrderHistoryHeaderProps) {
  return (
    <div className="px-4 pt-3 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/account"
          aria-label="Go back to account"
          className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#062402] hover:bg-[#EAF7D8] active:scale-90 transition-all shrink-0 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[22px] text-[#062402] font-bold tracking-tight truncate leading-tight font-sans">
            Order History
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#4b6723] inline-block animate-pulse" />
            <p className="text-xs text-[#43483f] font-semibold">
              {activeCount} Active • {deliveredCount} Delivered
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Filter orders"
          onClick={onToggleFilterSearch}
          className="w-9 h-9 rounded-full bg-[#efeeeb] text-[#43483f] hover:text-[#062402] active:scale-95 transition-all flex items-center justify-center shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Authenticity Hologram Vault"
          onClick={onOpenVault}
          className="w-9 h-9 rounded-full bg-[#EAF7D8] text-[#516d29] active:scale-95 transition-all flex items-center justify-center shadow-sm"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
