// app/admin/shortlist/components/ShortlistStatsHeader.tsx
// 4 KPI Metric Cards matching Stitch Screen ID: 39286148a6704e6995ed026438f698cf

'use client';

import React from 'react';
import { ShortlistStats } from '../types';

interface ShortlistStatsHeaderProps {
  stats: ShortlistStats;
}

export default function ShortlistStatsHeader({ stats }: ShortlistStatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Pending Orders Card */}
      <div className="rounded-xl bg-[#122131] border border-[#273647] p-4 flex flex-col justify-between hover:border-[#f97316]/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8a8f98] uppercase tracking-wider">
            Pending Orders
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 border border-[#f97316]/30 flex items-center justify-center text-[#f97316]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#f7f8f8]">
              {stats.pendingOrders}
            </span>
            <span className="text-xs font-semibold text-[#f97316]">orders</span>
          </div>
          <p className="text-[11px] text-[#8a8f98] mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse"></span>
            Immediate action required
          </p>
        </div>
      </div>

      {/* 2. Products to Buy Card */}
      <div className="rounded-xl bg-[#122131] border border-[#273647] p-4 flex flex-col justify-between hover:border-[#6366f1]/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8a8f98] uppercase tracking-wider">
            Products To Buy
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/30 flex items-center justify-center text-[#6366f1]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#f7f8f8]">
              {stats.productsRemaining}
            </span>
            <span className="text-xs text-[#8a8f98] font-medium">remaining</span>
            <span className="text-xs text-[#8a8f98]">/ {stats.productsTotal}</span>
          </div>
          <p className="text-[11px] text-[#4edea3] mt-1 font-medium">
            {stats.acquiredProducts} items ({stats.acquiredPercentage}%) acquired / done
          </p>
        </div>
      </div>

      {/* 3. Expected Profit Card */}
      <div className="rounded-xl bg-[#122131] border border-[#273647] p-4 flex flex-col justify-between hover:border-[#4edea3]/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8a8f98] uppercase tracking-wider">
            Expected Profit
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#4edea3]/15 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#4edea3]">
              ৳ {stats.expectedProfit.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-[#8a8f98] mt-1 font-medium">
            Gross Margin: <span className="text-[#4edea3] font-bold">{stats.grossMarginPercent}%</span> • Avg: ৳ {stats.avgProfitPerOrder}
          </p>
        </div>
      </div>

      {/* 4. Total Order Revenue Card */}
      <div className="rounded-xl bg-[#122131] border border-[#273647] p-4 flex flex-col justify-between hover:border-[#c0c1ff]/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8a8f98] uppercase tracking-wider">
            Total Order Revenue
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#c0c1ff]/15 border border-[#c0c1ff]/30 flex items-center justify-center text-[#c0c1ff]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#f7f8f8]">
              ৳ {stats.totalOrderRevenue.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-[#8a8f98] mt-1 font-medium">
            Wholesale Cost: ৳ {stats.wholesaleCost.toLocaleString()} ({stats.roiPercent}% ROI)
          </p>
        </div>
      </div>
    </div>
  );
}
