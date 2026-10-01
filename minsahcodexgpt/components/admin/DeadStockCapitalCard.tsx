'use client';

// components/admin/DeadStockCapitalCard.tsx
// Pillar 9 & Refinement 6: Dead-Stock & Tied-Up Capital Release with 1-Click Clearance Flash Sale Bridge

import React, { useState, useEffect } from 'react';
import { Archive, TrendingDown, DollarSign, RefreshCw, Flame, Zap, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface DeadStockItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  tiedUpCapital: number;
  potentialRevenue: number;
  daysSinceLastSold: number;
  recommendedAction: string;
}

interface DeadStockSummary {
  thresholdDays: number;
  deadStockProductCount: number;
  totalUnitsIdle: number;
  totalTiedUpCapital: number;
  potentialRecoveryRevenue: number;
}

export default function DeadStockCapitalCard() {
  const [summary, setSummary] = useState<DeadStockSummary | null>(null);
  const [items, setItems] = useState<DeadStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Refinement 6: 1-Click Clearance Flash Sale state
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [clearanceAppliedMap, setClearanceAppliedMap] = useState<Record<string, boolean>>({});
  const [clearanceNotice, setClearanceNotice] = useState<string | null>(null);

  const fetchDeadStock = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/inventory/dead-stock?thresholdDays=45', {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSummary(json.data.summary);
        setItems(json.data.items);
      }
    } catch (err) {
      console.warn('Failed to fetch dead-stock capital:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadStock();
  }, []);

  const handleToggleClearance = async (productId: string, pct = 20, isApplied = false) => {
    try {
      setApplyingId(productId);
      setClearanceNotice(null);
      const res = await fetch('/api/admin/inventory/clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          discountPercent: pct,
          action: isApplied ? 'REMOVE' : 'APPLY',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setClearanceNotice(json.message);
        setClearanceAppliedMap((prev) => ({
          ...prev,
          [productId]: !isApplied,
        }));
      }
    } catch (err: any) {
      console.error('Clearance sale error:', err);
    } finally {
      setApplyingId(null);
    }
  };

  if (!summary || summary.deadStockProductCount === 0) {
    return null;
  }

  return (
    <div className="mb-5 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-[#15101f] to-[#10121b] p-4 shadow-lg shadow-purple-500/5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-500/20 p-2 text-purple-400 border border-purple-500/30 flex-shrink-0 mt-0.5">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                ডেড-স্টক ও অলস মূলধন রিলিজ — ৳{summary.totalTiedUpCapital.toLocaleString()} আটকে আছে
              </h3>
              <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.2 text-[10px] font-mono font-bold text-purple-300">
                CAPITAL AT RISK
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              গত <strong className="text-purple-300">{summary.thresholdDays} দিনে ০ বিক্রি</strong> হওয়া{' '}
              <strong className="text-white">{summary.deadStockProductCount}টি প্রোডাক্টে</strong> মোট{' '}
              <strong className="text-amber-400">{summary.totalUnitsIdle.toLocaleString()} পিস</strong> অলস পড়ে আছে।
              ক্লিয়ারেন্স বা ফ্ল্যাশ সেলে ক্যাশ রিকভার করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="h-8 rounded-lg border border-[#322346] bg-[#1d142a] hover:bg-[#291b3b] text-xs font-medium text-purple-200 hover:text-white px-3 transition-colors cursor-pointer"
          >
            {expanded ? 'তালিকা লুকান' : 'প্রোডাক্ট তালিকা দেখুন'}
          </button>

          <Link
            href="/admin/promotions"
            className="h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold px-3 text-xs shadow-md shadow-purple-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>ফ্ল্যাশ সেল ডিসকাউন্ট চালান</span>
          </Link>
        </div>
      </div>

      {/* Refinement 6: Live Clearance Notice Banner */}
      {clearanceNotice && (
        <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{clearanceNotice}</span>
        </div>
      )}

      {/* Expanded Dead Stock Products Table */}
      {expanded && items.length > 0 && (
        <div className="mt-4 pt-3 border-t border-purple-500/20 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-[#232636]">
                <th className="pb-2 font-medium">SKU / প্রোডাক্ট</th>
                <th className="pb-2 font-medium">অলস স্টক</th>
                <th className="pb-2 font-medium">কেনা দাম</th>
                <th className="pb-2 font-medium">আটকে থাকা মূলধন</th>
                <th className="pb-2 font-medium">অ্যাকশন পরামর্শ</th>
                <th className="pb-2 font-medium text-right">১-ক্লিক ক্লিয়ারেন্স সেল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2333]">
              {items.slice(0, 10).map((it) => {
                const isCleared = clearanceAppliedMap[it.id];
                const isWorking = applyingId === it.id;

                return (
                  <tr key={it.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 text-white">
                      <span className="font-semibold block">{it.name}</span>
                      <span className="text-[10px] text-gray-500">{it.sku}</span>
                    </td>
                    <td className="py-2.5 text-amber-300 font-bold">{it.quantity} pcs</td>
                    <td className="py-2.5 text-slate-300">৳{it.costPrice}</td>
                    <td className="py-2.5 text-rose-400 font-bold">৳{it.tiedUpCapital.toLocaleString()}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {it.recommendedAction}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {isCleared ? (
                        <button
                          type="button"
                          onClick={() => handleToggleClearance(it.id, 20, true)}
                          disabled={isWorking}
                          className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          {isWorking ? 'প্রসেসিং...' : '✕ সেল বন্ধ করুন'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleClearance(it.id, 20, false)}
                          disabled={isWorking}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-sm"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>{isWorking ? 'এক্টিভ হচ্ছে...' : '⚡ ২০% ক্লিয়ারেন্স'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
