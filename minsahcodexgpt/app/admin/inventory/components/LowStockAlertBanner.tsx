// app/admin/inventory/components/LowStockAlertBanner.tsx
// Real-time Low Stock & Stockout Prevention Alert Banner with 1-Click Shortlisting

'use client';

import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LowStockAlertBannerProps {
  outOfStockCount: number;
  lowStockCount: number;
  urgentRunoutCount?: number;
  onFilterLowStock: () => void;
  onShortlistSuccess?: () => void;
}

export default function LowStockAlertBanner({
  outOfStockCount,
  lowStockCount,
  urgentRunoutCount: propUrgentRunoutCount,
  onFilterLowStock,
  onShortlistSuccess,
}: LowStockAlertBannerProps) {
  const [shortlisting, setShortlisting] = useState(false);
  const [shortlistDone, setShortlistDone] = useState(false);
  const [fetchedUrgentRunoutCount, setFetchedUrgentRunoutCount] = useState<number>(0);

  const urgentRunoutCount = propUrgentRunoutCount !== undefined ? propUrgentRunoutCount : fetchedUrgentRunoutCount;

  React.useEffect(() => {
    if (propUrgentRunoutCount !== undefined) return;
    fetch('/api/admin/inventory/alerts?filter=all_alerts', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.summary) {
          setFetchedUrgentRunoutCount(json.data.summary.criticalRunoutAlerts || 0);
        }
      })
      .catch(() => {});
  }, [outOfStockCount, lowStockCount, propUrgentRunoutCount]);

  const totalUrgent = outOfStockCount + lowStockCount;
  if (totalUrgent === 0) return null;

  const handle1ClickShortlist = async () => {
    setShortlisting(true);
    try {
      // 1. Fetch critical alert product IDs
      const res = await fetch('/api/admin/inventory/alerts?filter=all_alerts', {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data?.alerts)) {
        const productIds = json.data.alerts.map((a: any) => a.id);
        if (productIds.length > 0) {
          // 2. Batch add to shortlist
          const postRes = await fetch('/api/admin/inventory/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              productIds,
              priority: 2, // URGENT
              note: 'Auto-shortlisted via Low Stock Alert 1-Click Action',
            }),
          });
          const postJson = await postRes.json();
          if (postJson.success) {
            setShortlistDone(true);
            onShortlistSuccess?.();
            setTimeout(() => setShortlistDone(false), 5000);
          }
        }
      }
    } catch (err) {
      console.error('Failed to 1-click shortlist:', err);
    } finally {
      setShortlisting(false);
    }
  };

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#1a140b] to-[#10121b] p-4 shadow-lg shadow-amber-500/5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400 border border-amber-500/30 flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-tight">
                স্টক আউট সতর্কতা — {totalUrgent}টি প্রোডাক্ট ঝুঁকিপূর্ণ অবস্থায়
              </h3>
              <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.2 text-[10px] font-mono font-bold text-rose-300">
                CRITICAL
              </span>
              {urgentRunoutCount > 0 && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.2 text-[10px] font-mono font-bold text-amber-300">
                  ⚡ {urgentRunoutCount}টি রান-আউট হবে ≤৩ দিনে
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              <strong className="text-rose-400">{outOfStockCount}টি</strong> সম্পূর্ণ স্টক-আউট (০ পিস) এবং{' '}
              <strong className="text-amber-400">{lowStockCount}টি</strong> রিঅর্ডার লেভেলের নিচে রয়েছে। অবিলম্বে শর্টলিস্ট করুন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onFilterLowStock}
            className="h-8 rounded-lg border border-[#2e261a] bg-[#1a1610] hover:bg-[#282014] text-xs font-medium text-amber-200 hover:text-white px-3 transition-colors cursor-pointer"
          >
            ঝুঁকিপূর্ণ প্রোডাক্টগুলো দেখুন
          </button>

          <Button
            type="button"
            disabled={shortlisting || shortlistDone}
            onClick={handle1ClickShortlist}
            className="h-8 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 text-xs shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {shortlistDone ? (
              <span className="flex items-center gap-1 text-slate-950 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                শর্টলিস্ট সম্পন্ন! ✓
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 fill-current" />
                {shortlisting ? 'শর্টলিস্ট হচ্ছে...' : '১-ক্লিকে শর্টলিস্টে যোগ করুন'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
