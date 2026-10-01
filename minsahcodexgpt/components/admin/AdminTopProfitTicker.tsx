'use client';

// components/admin/AdminTopProfitTicker.tsx
// Pillar 5: Admin Top Header Live Daily Profit & Loss Ticker with Drawer Closing Trigger

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertOctagon,
  ChevronDown,
  Calculator,
  ExternalLink,
  RefreshCw,
  PackageX,
} from 'lucide-react';
import Link from 'next/link';
import DailyCashRegisterModal from './DailyCashRegisterModal';

interface ProfitabilityData {
  grossRevenue: number;
  totalCogs: number;
  grossProfit: number;
  deliveryDeficit: number;
  totalDiscounts: number;
  damagedLossTotal: number;
  damagedIncidentsCount: number;
  netProfit: number;
  netProfitMarginPercent: number;
  status: 'PROFITABLE' | 'UNPROFITABLE';
}

export default function AdminTopProfitTicker() {
  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [registerModalOpen, setRegisterModalOpen] = useState<boolean>(false);

  const fetchDailyProfit = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/analytics/daily-sales?range=1d', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success && json.data?.profitability) {
        setData(json.data.profitability);
      }
    } catch (err) {
      console.warn('[AdminTopProfitTicker] Failed to fetch live profit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyProfit();
    // Poll every 60 seconds for live updates
    const interval = setInterval(fetchDailyProfit, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-[#232636] text-[11px] text-[#8a8f98]">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse" />
        <span>Today: Net Profit calculating...</span>
      </div>
    );
  }

  const isProfitable = data.netProfit >= 0;

  return (
    <div className="relative inline-block text-left">
      {/* Top Header Pill */}
      <button
        type="button"
        onClick={() => setOpenDropdown(!openDropdown)}
        className="flex items-center gap-2 h-7 px-2.5 rounded-md bg-[#0f111a] hover:bg-[#161926] border border-[#232636] hover:border-[#383d54] text-[12px] transition-all cursor-pointer select-none"
        title="Click for today's live financial profit breakdown"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[#8a8f98] font-medium hidden xl:inline">Today Net:</span>
          <span
            className={`font-semibold tracking-tight ${
              isProfitable ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfitable ? `+৳${data.netProfit.toLocaleString()}` : `-৳${Math.abs(data.netProfit).toLocaleString()}`}
          </span>
        </div>

        <span className="text-[#555a6d] font-mono text-[10px]">|</span>

        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[#8a8f98] hidden sm:inline">Margin:</span>
          <span
            className={`font-medium ${
              data.netProfitMarginPercent >= 15
                ? 'text-emerald-300'
                : data.netProfitMarginPercent > 0
                  ? 'text-amber-300'
                  : 'text-rose-300'
            }`}
          >
            {data.netProfitMarginPercent}%
          </span>
        </div>

        {data.damagedLossTotal > 0 && (
          <span
            className="flex items-center text-[10px] text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20"
            title={`৳${data.damagedLossTotal} damaged write-off deducted`}
          >
            <PackageX className="w-3 h-3 mr-0.5" /> -৳{data.damagedLossTotal}
          </span>
        )}

        <ChevronDown
          className={`w-3 h-3 text-[#8a8f98] transition-transform duration-200 ${
            openDropdown ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Flyout Breakdown Popover */}
      {openDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenDropdown(false)}
          />
          <div className="absolute right-0 mt-1.5 w-80 rounded-lg bg-[#0e1017] border border-[#232636] shadow-2xl z-50 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-[#232636]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Today's Real-time Profit Engine</span>
              </div>
              <button
                type="button"
                onClick={fetchDailyProfit}
                disabled={loading}
                className="text-[#8a8f98] hover:text-white p-1 rounded hover:bg-white/[0.04]"
                title="Refresh numbers"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Waterfall Breakdown Matrix */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-gray-300">
                <span className="text-[#8a8f98]">Gross Revenue (Delivered)</span>
                <span className="font-semibold text-white">৳{data.grossRevenue.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-gray-300">
                <span className="text-[#8a8f98]">(-) Product COGS (Buy Price)</span>
                <span className="text-amber-400">-৳{data.totalCogs.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-gray-300">
                <span className="text-[#8a8f98]">(-) Courier Delivery Deficit</span>
                <span className="text-amber-400">-৳{data.deliveryDeficit.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-gray-300">
                <span className="text-[#8a8f98]">(-) Discounts Applied</span>
                <span className="text-amber-400">-৳{data.totalDiscounts.toLocaleString()}</span>
              </div>

              {data.damagedLossTotal > 0 && (
                <div className="flex justify-between items-center text-rose-400">
                  <span className="flex items-center gap-1">
                    <PackageX className="w-3 h-3" /> (-) Damaged Scrap Write-off
                  </span>
                  <span className="font-semibold">-৳{data.damagedLossTotal.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#232636] flex justify-between items-center text-sm font-bold">
                <span className="text-white">Net Daily Profit</span>
                <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                  {isProfitable ? `+৳${data.netProfit.toLocaleString()}` : `-৳${Math.abs(data.netProfit).toLocaleString()}`}
                  <span className="ml-1 text-[11px] font-normal text-gray-400">({data.netProfitMarginPercent}%)</span>
                </span>
              </div>
            </div>

            {/* Fast Actions */}
            <div className="pt-2 border-t border-[#232636] space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(false);
                  setRegisterModalOpen(true);
                }}
                className="w-full h-8 px-2.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Close Cash Drawer (Pillar 10)</span>
              </button>

              <Link
                href="/admin/analytics"
                onClick={() => setOpenDropdown(false)}
                className="w-full h-7 px-2 rounded hover:bg-white/[0.04] text-[#8a8f98] hover:text-white text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <span>Open Financial Intelligence Dashboard</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Drawer Closing Modal */}
      <DailyCashRegisterModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={fetchDailyProfit}
      />
    </div>
  );
}
