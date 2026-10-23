'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';

interface RecentlyViewedReCompareBentoProps {
  onCompare?: () => void;
}

export function RecentlyViewedReCompareBento({ onCompare }: RecentlyViewedReCompareBentoProps) {
  return (
    <section className="flex flex-col gap-2.5 pt-1">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E2DED8]" />
        <span className="text-xs text-[#062402] font-bold">
          Earlier this week
        </span>
      </div>

      <div className="bg-[#F2F6F0] rounded-[28px] p-4 flex flex-col gap-3 border border-[#E2DED8]/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-[#062402]" />
            <span className="text-xs font-bold text-[#062402]">
              Quick Re-Compare
            </span>
          </div>
          <span className="text-[10px] text-[#43483f] font-medium bg-white/70 px-2 py-0.5 rounded-full">
            Saved session
          </span>
        </div>

        <p className="text-xs text-[#43483f] leading-snug">
          Compare hydration depth &amp; texture: <strong className="text-[#181C1A]">Elixir Vital Serum</strong> vs <strong className="text-[#181C1A]">Anua Toner</strong>
        </p>

        {/* Duo mini thumbs */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="flex items-center -space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-[#E2DED8] relative">
              <Image
                src="/images/products/elixir-serum.png"
                alt="Elixir serum"
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-sm border border-[#E2DED8] relative">
              <Image
                src="/images/products/anua-toner.png"
                alt="Anua toner"
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-[#062402] truncate">
              Barrier Recovery vs Pore Calming
            </span>
            <span className="block text-[11px] text-[#43483f]">
              ৳3,990 combined pair
            </span>
          </div>

          <Link
            href="/comparison"
            onClick={onCompare}
            className="px-3 py-1.5 rounded-full bg-[#1c3a13] text-white text-[11px] font-bold active:scale-95 transition-all shrink-0"
          >
            Compare Specs →
          </Link>
        </div>
      </div>
    </section>
  );
}
