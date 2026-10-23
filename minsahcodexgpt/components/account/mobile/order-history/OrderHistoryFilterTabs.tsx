'use client';

import React from 'react';
import type { OrderStatusFilter } from './types';

interface OrderHistoryFilterTabsProps {
  currentFilter: OrderStatusFilter;
  counts: {
    all: number;
    transit: number;
    delivered: number;
    cancelled: number;
  };
  onSelectFilter: (filter: OrderStatusFilter) => void;
}

export default function OrderHistoryFilterTabs({
  currentFilter,
  counts,
  onSelectFilter,
}: OrderHistoryFilterTabsProps) {
  const tabs: Array<{ key: OrderStatusFilter; label: string; count: number; dot?: boolean }> = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'transit', label: 'In Transit', count: counts.transit, dot: true },
    { key: 'delivered', label: 'Delivered', count: counts.delivered },
    { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  return (
    <div className="px-4 pb-4 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = currentFilter === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectFilter(tab.key)}
            className={`h-9 px-4 rounded-full text-xs font-bold shrink-0 active:scale-95 transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              isActive
                ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
            }`}
          >
            {tab.dot && (
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-[#ccee9b]' : 'bg-[#4b6723]'
                }`}
              />
            )}
            <span>{tab.label}</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] inline-flex items-center justify-center font-bold ${
                isActive
                  ? 'bg-[#28531c] text-[#D4F6A2]'
                  : 'bg-[#E2DED8]/70 text-[#43483f]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
