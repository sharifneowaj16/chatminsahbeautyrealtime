'use client';

import Image from 'next/image';
import { formatPrice } from '@/utils/currency';
import { RecentlyViewedItem } from './types';

interface RecentlyViewedFloatingResumeBarProps {
  lastViewedItem: RecentlyViewedItem;
  onQuickAdd: (item: RecentlyViewedItem) => void;
}

export function RecentlyViewedFloatingResumeBar({
  lastViewedItem,
  onQuickAdd,
}: RecentlyViewedFloatingResumeBarProps) {
  return (
    <aside className="fixed bottom-4 left-0 right-0 z-40 px-4 w-full pointer-events-none">
      <div className="pointer-events-auto max-w-md mx-auto bg-[#062402] text-white rounded-full px-3.5 py-2 shadow-[0_8px_20px_rgba(6,36,2,0.28)] flex items-center justify-between gap-2.5 border border-[#ccee9b]/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white shrink-0 relative border border-white/20">
            <Image
              src={lastViewedItem.image}
              alt={lastViewedItem.name}
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] text-[#ccee9b] leading-none uppercase font-bold tracking-wider">
              Last Viewed
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-[150px]">
              {lastViewedItem.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-[#ccee9b]">
            {formatPrice(lastViewedItem.price)}
          </span>
          <button
            type="button"
            onClick={() => onQuickAdd(lastViewedItem)}
            className="px-3 py-1 rounded-full bg-[#ccee9b] text-[#1c3a13] text-[11px] font-bold active:scale-95 transition-transform"
          >
            Quick Add
          </button>
        </div>
      </div>
    </aside>
  );
}
