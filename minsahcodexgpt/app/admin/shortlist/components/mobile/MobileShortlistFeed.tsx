// app/admin/shortlist/components/mobile/MobileShortlistFeed.tsx
// 100% Mobile Pixel Parity for Stitch Screen 154483a9343a44c19867b784ced89410
// Base Mobile Purchase Shortlist Feed with Sticky Header, Route Filters & Product Cards

'use client';

import React, { useState, useMemo } from 'react';
import { WholesaleSkuRow, WholesaleZone } from '../../types';
import MobileProductCard from './MobileProductCard';
import {
  RefreshCw,
  Bell,
  User,
  Timer,
  Navigation,
  ShoppingBag,
  Wallet,
  Store,
  Search,
  CheckSquare,
  Square,
  Printer,
  CheckCheck,
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

export type MobileZoneFilter = WholesaleZone | 'URGENT';

interface MobileShortlistFeedProps {
  skus: WholesaleSkuRow[];
  selectedSkuIds: Set<string>;
  onToggleSelectRow: (skuId: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  activeZone: MobileZoneFilter;
  onSelectZone: (zone: MobileZoneFilter) => void;
  onAcquireClick: (sku: WholesaleSkuRow) => void;
  onOrdersDemandClick: (sku: WholesaleSkuRow) => void;
  onPrintThermalSlipClick: (sku?: WholesaleSkuRow) => void;
  runnerName?: string;
  runnerBudget?: number;
  spentAmount?: number;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

export default function MobileShortlistFeed({
  skus,
  selectedSkuIds,
  onToggleSelectRow,
  onToggleSelectAll,
  isAllSelected,
  activeZone,
  onSelectZone,
  onAcquireClick,
  onOrdersDemandClick,
  onPrintThermalSlipClick,
  runnerName = 'Shakil',
  runnerBudget = 15000,
  spentAmount = 4500,
  onRefresh,
  isSyncing = false,
}: MobileShortlistFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(
    skus[0]?.id || null // Screen 2 default: first card expanded
  );

  // Compute cluster counts
  const clusterCounts = useMemo(() => {
    let urgent = 0;
    let paltan = 0;
    let chawkbazar = 0;
    let elephant = 0;

    skus.forEach((sku) => {
      if (sku.priority === 'URGENT' || sku.demandTag?.toLowerCase().includes('urgent')) {
        urgent++;
      }
      const zone = (sku.vendor?.zone || '').toUpperCase();
      if (zone.includes('PALTAN')) paltan++;
      else if (zone.includes('CHAWKBAZAR')) chawkbazar++;
      else if (zone.includes('ELEPHANT')) elephant++;
    });

    return {
      urgent,
      paltan,
      chawkbazar,
      elephant,
    };
  }, [skus]);

  // Filter SKUs
  const filteredSkus = useMemo(() => {
    return skus.filter((sku) => {
      // Zone match
      if (activeZone === 'URGENT') {
        if (sku.priority !== 'URGENT' && !sku.demandTag?.toLowerCase().includes('urgent')) {
          return false;
        }
      } else if (activeZone !== 'ALL') {
        const skuZone = (sku.vendor?.zone || '').toUpperCase();
        if (activeZone === 'ELEPHANT_RD') {
          if (!skuZone.includes('ELEPHANT')) return false;
        } else if (!skuZone.includes(activeZone.toUpperCase())) {
          return false;
        }
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = sku.title.toLowerCase().includes(q);
        const skuMatch = sku.sku.toLowerCase().includes(q);
        const vendorMatch = sku.vendor.stallName.toLowerCase().includes(q);
        return titleMatch || skuMatch || vendorMatch;
      }

      return true;
    });
  }, [skus, activeZone, searchQuery]);

  // Total required quantity
  const totalQuantity = useMemo(() => {
    return skus.reduce((sum, s) => sum + s.requiredQuantity, 0);
  }, [skus]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#051424] text-[#d4e4fa] font-sans pb-28 select-none">
      {/* ── 1. Top Fixed App Header (Stitch Ground Truth) ── */}
      <header className="sticky top-0 z-40 bg-[#051424]/90 backdrop-blur-xl border-b border-[#172a3e] px-4 py-3 shadow-[0_4px_20px_rgba(1,15,31,0.6)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <span className="font-bold text-sm text-indigo-400 font-mono">MB</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white truncate">Minsah Ops</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-mono font-bold shrink-0">
                  ADMIN
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-400 tracking-wider font-semibold uppercase font-mono">
                  DHAKA LIVE
                </span>
                <span className="text-slate-600 text-[10px]">•</span>
                <span className="text-[11px] text-slate-400 truncate font-medium">
                  {runnerName} ({runnerBudget - spentAmount > 0 ? `৳${(runnerBudget - spentAmount).toLocaleString()} Float` : 'Shortlist'})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#0d1c2d] hover:bg-[#172a3e] active:bg-[#1f344d] text-slate-300 hover:text-white transition-colors border border-[#1f2f45]"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[#0d1c2d] hover:bg-[#172a3e] active:bg-[#1f344d] text-slate-300 hover:text-white transition-colors border border-[#1f2f45]"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#051424]"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. Urgent Operational Cutoff Banner ── */}
      <section className="px-4 pt-3 pb-1.5">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[#d4e4fa] shadow-md flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <Timer className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14px] leading-tight text-amber-300 font-bold tracking-tight">
                  {clusterCounts.urgent} Urgent Items
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0d1c2d] border border-amber-500/30 text-amber-200 font-mono font-semibold">
                  42m left
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Cutoff: 3:30 PM • Runner Dispatch Alert
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectZone('URGENT')}
            className="shrink-0 h-8 px-2.5 rounded-lg bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-95 border border-amber-500/30 text-emerald-400 flex items-center gap-1 text-[11px] font-bold font-mono transition-transform"
          >
            <Navigation className="h-3.5 w-3.5 text-emerald-400" />
            <span>Auto-Route</span>
          </button>
        </div>
      </section>

      {/* ── 3. Summary KPI Cards Carousel (3 Cards) ── */}
      <section className="px-4 py-2">
        <div className="grid grid-cols-3 gap-2">
          {/* KPI 1: To Procure */}
          <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between shadow-sm min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-semibold truncate">
                To Procure
              </span>
              <ShoppingBag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base text-white font-bold font-mono">{totalQuantity}</span>
              <span className="text-[10px] text-slate-400 font-medium">pcs</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono truncate mt-0.5">
              {skus.length} SKUs total
            </span>
          </div>

          {/* KPI 2: Cash Float */}
          <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between shadow-sm min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-semibold truncate">
                Cash Float
              </span>
              <Wallet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base text-emerald-400 font-bold font-mono">
                ৳{(runnerBudget - spentAmount).toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
              ৳{spentAmount.toLocaleString()} spent
            </span>
          </div>

          {/* KPI 3: Markets */}
          <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between shadow-sm min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-semibold truncate">
                Markets
              </span>
              <Store className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base text-white font-bold font-mono">3 hubs</span>
            </div>
            <span className="text-[10px] text-amber-300 font-mono truncate mt-0.5">
              Paltan #1
            </span>
          </div>
        </div>
      </section>

      {/* ── 4. Market Cluster Filter Pills & Search ── */}
      <section className="px-4 py-1.5 space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => onSelectZone('URGENT')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all active:scale-95 flex items-center gap-1 border ${
              activeZone === 'URGENT'
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0d1c2d] text-amber-300 border-amber-500/30 hover:bg-[#172a3e]'
            }`}
          >
            <span>⚡ All Urgent ({clusterCounts.urgent})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectZone('ALL')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border ${
              activeZone === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
            }`}
          >
            All SKUs ({skus.length})
          </button>

          <button
            type="button"
            onClick={() => onSelectZone('PALTAN')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border ${
              activeZone === 'PALTAN'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
            }`}
          >
            Paltan ({clusterCounts.paltan})
          </button>

          <button
            type="button"
            onClick={() => onSelectZone('CHAWKBAZAR')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border ${
              activeZone === 'CHAWKBAZAR'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
            }`}
          >
            Chawkbazar ({clusterCounts.chawkbazar})
          </button>

          <button
            type="button"
            onClick={() => onSelectZone('ELEPHANT_RD')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold font-mono transition-all active:scale-95 border ${
              activeZone === 'ELEPHANT_RD'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-[#0d1c2d] text-slate-300 border-[#1f2f45] hover:bg-[#172a3e]'
            }`}
          >
            Elephant Rd ({clusterCounts.elephant})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU code, product title, stall name..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0d1c2d] border border-[#1f2f45] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </section>

      {/* ── 5. Batch Action Sub-Bar ── */}
      <section className="px-4 py-1 flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 font-medium hover:text-white transition-colors cursor-pointer"
        >
          {isAllSelected ? (
            <CheckSquare className="h-4 w-4 text-emerald-400" />
          ) : (
            <Square className="h-4 w-4 text-slate-500" />
          )}
          <span>Select All ({filteredSkus.length})</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPrintThermalSlipClick()}
            className="h-7 px-2.5 rounded-md bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-95 border border-[#1f2f45] text-indigo-300 flex items-center gap-1 font-mono text-[11px] font-semibold transition-transform"
          >
            <Printer className="h-3 w-3" />
            <span>80mm</span>
          </button>

          {selectedSkuIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                const first = filteredSkus.find((s) => selectedSkuIds.has(s.id));
                if (first) onAcquireClick(first);
              }}
              className="h-7 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center gap-1 font-mono text-[11px] font-bold shadow-md shadow-emerald-600/20 transition-transform"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Acquire ({selectedSkuIds.size})</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 6. Mobile Product Cards List ── */}
      <section className="px-4 pt-1.5 flex flex-col gap-2.5">
        {filteredSkus.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No products found for this market cluster or search query.
          </div>
        ) : (
          filteredSkus.map((sku) => (
            <MobileProductCard
              key={sku.id}
              sku={sku}
              isSelected={selectedSkuIds.has(sku.id)}
              isExpanded={expandedCardId === sku.id}
              onToggleSelect={() => onToggleSelectRow(sku.id)}
              onToggleExpand={() =>
                setExpandedCardId((prev) => (prev === sku.id ? null : sku.id))
              }
              onAcquire={() => onAcquireClick(sku)}
              onOrdersDemand={() => onOrdersDemandClick(sku)}
              onPrintSlip={() => onPrintThermalSlipClick(sku)}
            />
          ))
        )}
      </section>
    </div>
  );
}
