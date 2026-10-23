'use client';

import { ShieldCheck, Trash2 } from 'lucide-react';

interface RecentlyViewedPrivacyBarProps {
  itemCount: number;
  onClearHistory: () => void;
}

export function RecentlyViewedPrivacyBar({
  itemCount,
  onClearHistory,
}: RecentlyViewedPrivacyBarProps) {
  return (
    <section className="pt-2 pb-1 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse" />
          <span className="text-xs text-[#43483f] font-medium">
            Tracking Active (Private to you)
          </span>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F6F0] text-[#43483f] hover:text-rose-600 active:scale-95 transition-all text-xs font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="flex items-baseline justify-between mt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#062402] tracking-tight">
            {itemCount} items tracked
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F0E5] text-[#062402] text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
            100% Authentic
          </span>
        </div>
      </div>
    </section>
  );
}
