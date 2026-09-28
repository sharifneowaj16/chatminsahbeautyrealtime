// app/admin/shortlist/page.tsx
// 100% Desktop Pixel Parity for Minsah Beauty Purchase Shortlist & Dual-Drawer Architecture
// Matching Stitch Ground Truth: Screen ID 46092511627045dd9f65eaa0328dd890

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  WholesaleSkuRow,
  WholesaleZone,
  WholesaleStatusTab,
  WholesalePickListManifestData,
  ThermalReceiptPayload,
} from './types';
import {
  INITIAL_WHOLESALE_SKUS,
  DEFAULT_PICK_LIST_MANIFEST,
  DEFAULT_THERMAL_RECEIPT,
} from './mockShortlistData';
import WholesaleTable from './components/WholesaleTable';
import BulkSourcingBar from './components/BulkSourcingBar';
import WholesalePickListDrawer from './components/WholesalePickListDrawer';
import ThermalPickSlipDrawer from './components/ThermalPickSlipDrawer';

export default function ShortlistPage() {
  // ── 1. Data State ──────────────────────────────────────────
  const [skus, setSkus] = useState<WholesaleSkuRow[]>(INITIAL_WHOLESALE_SKUS);
  const [selectedSkuIds, setSelectedSkuIds] = useState<Set<string>>(
    new Set(['sku_lip_01', 'sku_serum_01']) // Ground truth pre-selected 2 SKUs
  );
  const [activeZone, setActiveZone] = useState<WholesaleZone>('ALL');
  const [activeTab, setActiveTab] = useState<WholesaleStatusTab>('SKU_MATRIX');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // ── 2. Dual-Drawer State Machine ───────────────────────────
  // Default to open matching Stitch ground truth screenshot where both drawers are rendered
  const [isPickListOpen, setIsPickListOpen] = useState(true);
  const [isThermalOpen, setIsThermalOpen] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── 3. Keyboard Shortcuts & Global ESC Stack ───────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to focus search input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Hierarchical ESC handler: closes the topmost active drawer
      if (e.key === 'Escape') {
        if (isThermalOpen) {
          e.preventDefault();
          setIsThermalOpen(false);
        } else if (isPickListOpen) {
          e.preventDefault();
          setIsPickListOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThermalOpen, isPickListOpen]);

  // ── 4. Filtering Logic ─────────────────────────────────────
  const filteredSkus = useMemo(() => {
    return skus.filter((item) => {
      // Zone filter
      if (activeZone === 'PALTAN' && item.vendor.zone !== 'Paltan') return false;
      if (activeZone === 'CHAWKBAZAR' && item.vendor.zone !== 'Chawkbazar') return false;
      if (activeZone === 'ELEPHANT_RD' && item.vendor.zone !== 'Elephant Rd') return false;

      // Status Tab filter
      if (activeTab === 'PENDING' && item.isAcquired) return false;
      if (activeTab === 'URGENT' && item.priority !== 'URGENT') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesBarcode = item.barcode.includes(q);
        const matchesVendor = item.vendor.stallName.toLowerCase().includes(q);
        const matchesOrders = item.linkedOrders.some((o) =>
          o.orderNumber.toLowerCase().includes(q)
        );
        return matchesSku || matchesTitle || matchesBarcode || matchesVendor || matchesOrders;
      }

      return true;
    });
  }, [skus, activeZone, activeTab, searchQuery]);

  // ── 5. Dynamic Calculations ────────────────────────────────
  const selectedSkusList = useMemo(() => {
    return skus.filter((s) => selectedSkuIds.has(s.id));
  }, [skus, selectedSkuIds]);

  const selectedCount = selectedSkusList.length;
  const selectedUnits = selectedSkusList.reduce(
    (sum, s) => sum + s.requiredQuantity,
    0
  );
  const selectedCost = selectedSkusList.reduce(
    (sum, s) => sum + s.financials.totalCost,
    0
  );

  const isAllSelected =
    filteredSkus.length > 0 &&
    filteredSkus.every((item) => selectedSkuIds.has(item.id));

  // ── 6. Selection Handlers ──────────────────────────────────
  const handleToggleSelectRow = (skuId: string) => {
    setSelectedSkuIds((prev) => {
      const next = new Set(prev);
      if (next.has(skuId)) {
        next.delete(skuId);
      } else {
        next.add(skuId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSkuIds(new Set());
    } else {
      setSelectedSkuIds(new Set(filteredSkus.map((s) => s.id)));
    }
  };

  const handleAcquireSku = (skuId: string) => {
    setSkus((prev) =>
      prev.map((item) => {
        if (item.id === skuId) {
          const newAcquired = !item.isAcquired;
          return {
            ...item,
            isAcquired: newAcquired,
            pickedQuantity: newAcquired ? item.requiredQuantity : 0,
            progressPercent: newAcquired ? 100 : 0,
            statusNote: newAcquired ? 'Fully acquired' : '0 pcs picked',
          };
        }
        return item;
      })
    );
  };

  const handleMarkBatchAcquired = () => {
    if (selectedSkuIds.size === 0) return;
    setSkus((prev) =>
      prev.map((item) => {
        if (selectedSkuIds.has(item.id)) {
          return {
            ...item,
            isAcquired: true,
            pickedQuantity: item.requiredQuantity,
            progressPercent: 100,
            statusNote: 'Batch Acquired',
          };
        }
        return item;
      })
    );
  };

  // ── 7. Dynamic Manifest & Thermal Payload ──────────────────
  const manifestData: WholesalePickListManifestData = useMemo(() => {
    if (selectedSkusList.length === 0) {
      return DEFAULT_PICK_LIST_MANIFEST;
    }

    const hubsSet = new Set(selectedSkusList.map((s) => s.vendor.zone));
    const hubsCovered = Array.from(hubsSet).join(' & ');

    return {
      batchNumber: 'PL-84920',
      selectedSkusCount: selectedCount,
      selectedUnitsCount: selectedUnits,
      totalCashFloat: selectedCost,
      hubsCovered: hubsCovered || 'Dhaka Hub',
      qualityProtocolChecked: true,
      runnerName: 'Shakil',
      runnerCode: 'MSB-R04',
      walkingSteps: DEFAULT_PICK_LIST_MANIFEST.walkingSteps,
    };
  }, [selectedSkusList, selectedCount, selectedUnits, selectedCost]);

  const thermalPayload: ThermalReceiptPayload = useMemo(() => {
    return {
      ...DEFAULT_THERMAL_RECEIPT,
      totalUnits: selectedUnits || 5,
      totalSkus: selectedCount || 2,
      requiredCashFloat: selectedCost || 2720,
    };
  }, [selectedUnits, selectedCount, selectedCost]);

  return (
    <div className="min-h-screen bg-[#051424] text-[#e2eaf5] font-sans antialiased flex flex-col w-full -m-6 p-6">
      {/* ── Top Header Strip ── */}
      <header className="sticky top-0 z-40 h-14 bg-[#061220]/95 backdrop-blur-md border border-[#142336] rounded-xl flex items-center justify-between px-5 mb-4 shadow-sm">
        {/* Left Breadcrumb & Live Pulse */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span className="hover:text-slate-200 cursor-pointer">Ops</span>
            <span>/</span>
            <span className="hover:text-slate-200 cursor-pointer">Sourcing</span>
            <span>/</span>
            <span className="text-white font-semibold">Purchase Shortlist</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            LIVE BATCH #PL-84920
          </span>
        </div>

        {/* Center Search Input */}
        <div className="relative w-80">
          <input
            ref={searchInputRef}
            type="text"
            id="procurement-search"
            placeholder="Search SKU, order or barcode (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-8 rounded-lg bg-[#0a1727] border border-[#192b42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
          />
          <span className="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md bg-[#0a1727] border border-[#182a3d] text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
            <span className="text-emerald-400 text-xs">●</span>
            <span>Product-Centric Sourcing Mode</span>
          </span>
          <div className="h-4 w-px bg-[#192b42]"></div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">
              S
            </div>
            <div className="text-left text-xs font-mono leading-tight">
              <p className="font-semibold text-white">Shakil</p>
              <p className="text-[10px] text-slate-400">Dhaka Central Hub</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="space-y-4 w-full">
        {/* Status Matrix Tabs & Zone Multi-Pills Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
          {/* Left Status Tabs */}
          <div className="flex items-center gap-1 bg-[#091524] p-1 rounded-lg border border-[#152538]">
            <button
              type="button"
              onClick={() => setActiveTab('SKU_MATRIX')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeTab === 'SKU_MATRIX'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SKU Matrix (16)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending (10)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('URGENT')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeTab === 'URGENT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Urgent (4)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeTab === 'SUPPLIERS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Suppliers
            </button>
          </div>

          {/* Right Zone Pills */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 font-semibold mr-1">Zone:</span>
            <button
              type="button"
              onClick={() => setActiveZone('ALL')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                activeZone === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
              }`}
            >
              All (12)
            </button>
            <button
              type="button"
              onClick={() => setActiveZone('PALTAN')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                activeZone === 'PALTAN'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
              }`}
            >
              Paltan (4)
            </button>
            <button
              type="button"
              onClick={() => setActiveZone('CHAWKBAZAR')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                activeZone === 'CHAWKBAZAR'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
              }`}
            >
              Chawkbazar (5)
            </button>
            <button
              type="button"
              onClick={() => setActiveZone('ELEPHANT_RD')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                activeZone === 'ELEPHANT_RD'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#081320] hover:bg-[#112134] text-slate-300 border border-[#17273a]'
              }`}
            >
              Elephant Rd (3)
            </button>
          </div>
        </div>

        {/* Floating Bulk Selection Toolbar */}
        <BulkSourcingBar
          totalCount={filteredSkus.length}
          selectedCount={selectedCount}
          selectedUnits={selectedUnits}
          selectedCost={selectedCost}
          isAllSelected={isAllSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onOpenPickList={() => setIsPickListOpen(true)}
          onMarkBatchAcquired={handleMarkBatchAcquired}
        />

        {/* Wholesale SKU Matrix 6-Column Data Table */}
        <WholesaleTable
          skus={filteredSkus}
          selectedSkuIds={selectedSkuIds}
          onToggleSelectRow={handleToggleSelectRow}
          onAcquireSku={handleAcquireSku}
          onAssignRunner={() => setIsPickListOpen(true)}
        />

        {/* Footer Pagination & Rig Sync Note */}
        <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-400 select-none">
          <p>
            Showing 1 - {filteredSkus.length} of 16 SKUs •{' '}
            <span className="text-emerald-400 font-semibold">
              Scanner Rig 04 synced 2m ago
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2.5 rounded bg-[#0a1727] border border-[#172a3e] text-slate-400 hover:text-white flex items-center gap-0.5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className={`h-7 w-7 rounded flex items-center justify-center font-bold shadow-xs cursor-pointer ${
                currentPage === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0a1727] hover:bg-[#122336] border border-[#172a3e] text-slate-300'
              }`}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(2)}
              className={`h-7 w-7 rounded flex items-center justify-center font-bold cursor-pointer ${
                currentPage === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0a1727] hover:bg-[#122336] border border-[#172a3e] text-slate-300'
              }`}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(3)}
              className={`h-7 w-7 rounded flex items-center justify-center font-bold cursor-pointer ${
                currentPage === 3
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#0a1727] hover:bg-[#122336] border border-[#172a3e] text-slate-300'
              }`}
            >
              3
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
              className="h-7 px-2.5 rounded bg-[#0a1727] hover:bg-[#122336] border border-[#172a3e] text-slate-300 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      </main>

      {/* ── Drawer 1: Wholesale Pick List Manifest (#pick-list-drawer) ── */}
      <WholesalePickListDrawer
        isOpen={isPickListOpen}
        onClose={() => setIsPickListOpen(false)}
        manifest={manifestData}
        onOpenThermalSlip={() => setIsThermalOpen(true)}
        onMarkAcquired={handleMarkBatchAcquired}
      />

      {/* ── Drawer 2: 80mm ESC/POS Thermal Receipt Slip LIVE (#thermal-drawer) ── */}
      <ThermalPickSlipDrawer
        isOpen={isThermalOpen}
        onBackToManifest={() => setIsThermalOpen(false)}
        onClose={() => {
          setIsThermalOpen(false);
          setIsPickListOpen(false);
        }}
        receiptData={thermalPayload}
      />
    </div>
  );
}
