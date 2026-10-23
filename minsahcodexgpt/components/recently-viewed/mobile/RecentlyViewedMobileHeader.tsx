'use client';

import { ArrowLeft, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RecentlyViewedMobileHeaderProps {
  onClearHistory: () => void;
}

export function RecentlyViewedMobileHeader({ onClearHistory }: RecentlyViewedMobileHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-[#faf9f6]/90 backdrop-blur-xl border-b border-[#E2DED8]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full text-[#181C1A] hover:bg-[#F2F6F0] active:scale-95 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-bold text-[#181C1A] tracking-tight text-center truncate flex-1">
          Recently Viewed
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClearHistory}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#43483f] hover:text-rose-600 hover:bg-[#F2F6F0] active:scale-95 transition-all"
            aria-label="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center shrink-0 text-white">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
