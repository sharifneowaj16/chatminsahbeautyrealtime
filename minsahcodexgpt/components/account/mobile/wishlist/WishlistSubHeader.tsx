'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Zap } from 'lucide-react';

interface WishlistSubHeaderProps {
  itemsCount: number;
  onMoveAll?: () => void;
  onShare?: () => void;
}

export default function WishlistSubHeader({
  itemsCount,
  onMoveAll,
  onShare,
}: WishlistSubHeaderProps) {
  return (
    <section className="px-4 pt-2 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Link
          href="/account"
          aria-label="Go Back"
          className="w-9 h-9 rounded-full bg-white border border-[#E2DED8]/60 flex items-center justify-center text-[#1a1c1a] hover:text-[#062402] active:scale-95 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg text-[#062402] font-bold tracking-tight">My Wishlist</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#516d29] text-[11px] font-bold border border-[#4b6723]/20">
              {itemsCount} Items
            </span>
          </div>
          <p className="text-[11px] text-[#43483f] leading-none mt-1">
            Curated authentic formulations &amp; batch alerts
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Share Wishlist"
          onClick={onShare}
          className="w-10 h-10 rounded-full bg-white border border-[#E2DED8]/60 flex items-center justify-center text-[#1a1c1a] hover:text-[#062402] active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onMoveAll}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white text-xs font-bold tracking-wide active:scale-95 transition-all shadow-md hover:shadow-lg border border-[#ccee9b]/20 cursor-pointer"
        >
          <Zap className="w-4 h-4 text-[#D4F6A2] fill-[#D4F6A2]" />
          <span>Move All</span>
        </button>
      </div>
    </section>
  );
}
