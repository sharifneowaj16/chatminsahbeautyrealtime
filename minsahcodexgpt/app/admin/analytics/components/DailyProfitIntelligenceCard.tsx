// app/admin/analytics/components/DailyProfitIntelligenceCard.tsx
// Real Net Profit & Financial Intelligence Component for Minsah Beauty

'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, CheckCircle2, RefreshCw, ShoppingCart, Truck } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface DailyFinancialData {
  timeframe: { start: string; end: string; range: string };
  profitability: {
    grossRevenue: number;
    totalCogs: number;
    grossProfit: number;
    deliveryDeficit: number;
    totalDiscounts: number;
    netProfit: number;
    netProfitMarginPercent: number;
    status: 'PROFITABLE' | 'UNPROFITABLE';
  };
  orderMetrics: {
    totalOrders: number;
    deliveredOrders: number;
    confirmedOrders: number;
    cancelledOrders: number;
    returnedOrders: number;
    deliverySuccessRate: number;
  };
  cashFlow: {
    codCashCollected: number;
    onlinePaymentsCollected: number;
    pendingCourierReceivables: number;
    runnerCashGiven: number;
    runnerActualSpent: number;
    runnerCashReturned: number;
    runnerDiscrepancy: number;
  };
  topSellingItems: Array<{
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
    cogs: number;
    profit: number;
  }>;
}

export default function DailyProfitIntelligenceCard() {
  const [data, setData] = useState<DailyFinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<'1d' | '7d' | '30d'>('1d');

  const fetchDailySales = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/daily-sales?range=${range}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to load financial data');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to load financial data');
      }
    } catch (err) {
      console.error('Failed to fetch daily profit data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailySales();
  }, [range]);

  if (error && !data) {
    return (
      <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-300 text-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={() => fetchDailySales()}
          className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 font-medium text-rose-200 hover:bg-rose-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data && loading) {
    return (
      <div className="mb-6 rounded-2xl border border-[#232636] bg-[#10121b] p-6 flex items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-indigo-400 mr-2" />
        <span className="text-xs text-slate-400">রিয়েল নিট প্রফিট হিসাব লোড হচ্ছে...</span>
      </div>
    );
  }

  const prof = data?.profitability;
  const cash = data?.cashFlow;
  const isProfitable = (prof?.netProfit ?? 0) >= 0;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#232636] bg-[#10121b] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#232636]">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              দৈনিক সত্যিকারের লাভ ও আর্থিক চিত্র (Real Net Profit Engine)
            </h2>
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300">
              LIVE ACCRUAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            বিক্রয়মূল্য থেকে প্রকৃত কেনা দাম (Actual Buy Price/COGS) এবং কুরিয়ার ক্ষতি বাদ দিয়ে চূড়ান্ত নিট প্রফিট।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-[#070c14] border border-[#232636] p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setRange('1d')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                range === '1d' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                range === '7d' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setRange('30d')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                range === '30d' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            type="button"
            onClick={fetchDailySales}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#232636] bg-white/[0.05] text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Financials"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Financial Pillar KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        {/* Gross Revenue */}
        <div className="rounded-xl border border-[#202538] bg-[#0c0e17] p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">মোট ডেলিভারি বিক্রি</span>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {formatPrice(prof?.grossRevenue ?? 0)}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            অর্ডার সংখ্যা: <strong className="text-slate-200">{data?.orderMetrics.deliveredOrders ?? 0}টি</strong>
          </div>
        </div>

        {/* COGS */}
        <div className="rounded-xl border border-[#202538] bg-[#0c0e17] p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">প্রকৃত ক্রয়মূল্য (COGS)</span>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {formatPrice(prof?.totalCogs ?? 0)}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            গ্রস লাভ: <strong className="text-amber-200">{formatPrice(prof?.grossProfit ?? 0)}</strong>
          </div>
        </div>

        {/* Delivery Deficit & Discounts */}
        <div className="rounded-xl border border-[#202538] bg-[#0c0e17] p-3.5">
          <span className="text-[11px] font-mono uppercase text-slate-400">ডেলিভারি ক্ষতি ও ছাড়</span>
          <div className="text-xl font-bold font-mono text-rose-300 mt-1">
            {formatPrice((prof?.deliveryDeficit ?? 0) + (prof?.totalDiscounts ?? 0))}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            কুরিয়ার ঘাটতি: {formatPrice(prof?.deliveryDeficit ?? 0)}
          </div>
        </div>

        {/* Real Net Profit */}
        <div
          className={`rounded-xl border p-3.5 ${
            isProfitable
              ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-[#0c0e17]'
              : 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-[#0c0e17]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-300">খাঁটি নিট লাভ</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                isProfitable
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {prof?.netProfitMarginPercent ?? 0}% Margin
            </span>
          </div>
          <div
            className={`text-xl font-black font-mono mt-1 ${
              isProfitable ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPrice(prof?.netProfit ?? 0)}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {isProfitable ? '✓ লাভজনক ব্যবসা চলছে' : '⚠️ লস হচ্ছে — অপ্টিমাইজ করুন'}
          </div>
        </div>
      </div>

      {/* Cash Flow Strip */}
      <div className="mt-4 pt-3 border-t border-[#1b2234] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-[#080d18] rounded-lg p-2.5 border border-[#1a2338]">
          <span className="text-[10px] text-slate-400 block">ক্যাশ অন ডেলিভারি (COD)</span>
          <span className="text-white font-bold">{formatPrice(cash?.codCashCollected ?? 0)}</span>
        </div>
        <div className="bg-[#080d18] rounded-lg p-2.5 border border-[#1a2338]">
          <span className="text-[10px] text-slate-400 block">অনলাইন পরিশোধ</span>
          <span className="text-white font-bold">{formatPrice(cash?.onlinePaymentsCollected ?? 0)}</span>
        </div>
        <div className="bg-[#080d18] rounded-lg p-2.5 border border-[#1a2338]">
          <span className="text-[10px] text-slate-400 block">কুরিয়ারে আটকে থাকা টাকা</span>
          <span className="text-indigo-300 font-bold">{formatPrice(cash?.pendingCourierReceivables ?? 0)}</span>
        </div>
        <div className="bg-[#080d18] rounded-lg p-2.5 border border-[#1a2338]">
          <span className="text-[10px] text-slate-400 block">রানার ক্যাশ ব্যালেন্স</span>
          <span className={(cash?.runnerDiscrepancy ?? 0) === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {(cash?.runnerDiscrepancy ?? 0) === 0 ? '✓ কোনো গরমিল নেই' : `গরমিল: ${formatPrice(cash?.runnerDiscrepancy ?? 0)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
