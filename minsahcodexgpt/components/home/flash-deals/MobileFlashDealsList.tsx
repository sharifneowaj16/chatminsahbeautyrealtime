'use client';

import React, { useRef, useState, useCallback } from 'react';
import type { FlashDealItem } from './types';
import MobileFlashDealCard from './MobileFlashDealCard';
import MobileVerticalScrollbar from './MobileVerticalScrollbar';

interface MobileFlashDealsListProps {
  deals: FlashDealItem[];
  className?: string;
}

export default function MobileFlashDealsList({
  deals,
  className = '',
}: MobileFlashDealsListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const activeDeals = deals.filter((d) => d.isActive);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      const progress = (el.scrollTop / maxScroll) * 100;
      setScrollProgress(progress);
    }
  }, []);

  const handleScrollUp = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -140, behavior: 'smooth' });
    }
  };

  const handleScrollDown = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 140, behavior: 'smooth' });
    }
  };

  if (activeDeals.length === 0) return null;

  return (
    <div className={`md:hidden flex gap-2 w-full ${className}`}>
      {/* Scrollable Deals Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 flex flex-col gap-2.5 max-h-[340px] overflow-y-auto no-scrollbar overscroll-contain touch-pan-y pr-0.5"
      >
        {activeDeals.map((deal) => (
          <MobileFlashDealCard
            key={deal.id}
            deal={deal}
          />
        ))}
      </div>

      {/* Custom Vertical Scrollbar */}
      {activeDeals.length > 2 && (
        <MobileVerticalScrollbar
          progress={scrollProgress}
          onScrollUp={handleScrollUp}
          onScrollDown={handleScrollDown}
          className="self-stretch"
        />
      )}
    </div>
  );
}
