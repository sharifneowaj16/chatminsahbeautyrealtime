// app/admin/shortlist/components/mobile/MobileShortlistFeed.tsx
// 100% Mobile Pixel Parity for Stitch Screen 154483a9343a44c19867b784ced89410
// Composed via Granular Atomic Components from components/admin/shortlist/mobile/feed/

'use client';

import React, { useState, useMemo } from 'react';
import { WholesaleSkuRow, WholesaleZone } from '../../types';
import { MobileShortlistTopBar } from '@/components/admin/shortlist/mobile/feed/MobileShortlistTopBar';
import { MobileFloatBudgetCard } from '@/components/admin/shortlist/mobile/feed/MobileFloatBudgetCard';
import { MobileZoneCarousel } from '@/components/admin/shortlist/mobile/feed/MobileZoneCarousel';
import { MobileSearchFilterBar } from '@/components/admin/shortlist/mobile/feed/MobileSearchFilterBar';
import { MobileSelectAllToolbar } from '@/components/admin/shortlist/mobile/feed/MobileSelectAllToolbar';
import { MobileProductCard } from '@/components/admin/shortlist/mobile/feed/MobileProductCard';
import { MobileStickyBottomBar } from '@/components/admin/shortlist/mobile/feed/MobileStickyBottomBar';
import { Timer, Navigation } from 'lucide-react';

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
    skus[0]?.id || null
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

  const totalQuantity = useMemo(() => {
    return skus.reduce((sum, s) => sum + s.requiredQuantity, 0);
  }, [skus]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#051424] text-[#d4e4fa] font-sans pb-32 select-none">
      {/* ── 1. Top Fixed App Header ── */}
      <MobileShortlistTopBar
        runnerName={runnerName}
        runnerBudget={runnerBudget}
        spentAmount={spentAmount}
        isSyncing={isSyncing}
        onRefresh={onRefresh}
      />

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

      {/* ── 3. Summary KPI Cards ── */}
      <section className="px-4 py-2">
        <MobileFloatBudgetCard
          totalQuantity={totalQuantity}
          totalSkus={skus.length}
          runnerBudget={runnerBudget}
          spentAmount={spentAmount}
          hubCount={3}
          primaryHub="Paltan #1"
        />
      </section>

      {/* ── 4. Market Cluster Filter Pills & Search ── */}
      <section className="px-4 py-1.5 space-y-2">
        <MobileZoneCarousel
          activeZone={activeZone}
          onSelectZone={onSelectZone}
          urgentCount={clusterCounts.urgent}
          allCount={skus.length}
          paltanCount={clusterCounts.paltan}
          chawkbazarCount={clusterCounts.chawkbazar}
          elephantCount={clusterCounts.elephant}
        />

        <MobileSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCount={filteredSkus.length}
        />
      </section>

      {/* ── 5. Batch Action Sub-Bar ── */}
      <section className="px-4 py-1">
        <MobileSelectAllToolbar
          selectedCount={selectedSkuIds.size}
          totalCount={filteredSkus.length}
          isAllSelected={isAllSelected}
          onToggleSelectAll={onToggleSelectAll}
          onPrintThermalSlip={() => onPrintThermalSlipClick()}
          onBatchAcquire={() => {
            const first = filteredSkus.find((s) => selectedSkuIds.has(s.id));
            if (first) onAcquireClick(first);
          }}
        />
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

      {/* ── 7. Sticky Bottom Bar ── */}
      {selectedSkuIds.size > 0 && (
        <MobileStickyBottomBar
          selectedCount={selectedSkuIds.size}
          onBatchAcquire={() => {
            const first = filteredSkus.find((s) => selectedSkuIds.has(s.id));
            if (first) onAcquireClick(first);
          }}
          onPrintSlip={() => onPrintThermalSlipClick()}
        />
      )}
    </div>
  );
}
