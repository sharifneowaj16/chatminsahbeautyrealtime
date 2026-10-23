'use client';

import React from 'react';
import type { FlashDealItem } from './types';
import DesktopFlashDealCard from './DesktopFlashDealCard';

interface DesktopFlashDealsGridProps {
  deals: FlashDealItem[];
  className?: string;
}

export default function DesktopFlashDealsGrid({
  deals,
  className = '',
}: DesktopFlashDealsGridProps) {
  const activeDeals = deals.filter((d) => d.isActive).slice(0, 5);

  if (activeDeals.length === 0) return null;

  return (
    <div
      className={`hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5 lg:gap-4 w-full ${className}`}
    >
      {activeDeals.map((deal) => (
        <DesktopFlashDealCard
          key={deal.id}
          deal={deal}
        />
      ))}
    </div>
  );
}
