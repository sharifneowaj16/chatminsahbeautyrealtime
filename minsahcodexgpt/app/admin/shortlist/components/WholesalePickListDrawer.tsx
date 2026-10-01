// app/admin/shortlist/components/WholesalePickListDrawer.tsx
// Primary Wholesale Pick List Manifest Slide-Over Drawer matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)
// Pillars 1, 3, 11 & Refinements 2, 3, 4: Live Manifest Sync, Running Float Ledger & Margin Guardian

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WholesalePickListManifestData } from '../types';

interface WholesalePickListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: WholesalePickListManifestData;
  onOpenThermalSlip: () => void;
  onMarkAcquired?: () => void;
}

export default function WholesalePickListDrawer({
  isOpen,
  onClose,
  manifest,
  onOpenThermalSlip,
  onMarkAcquired,
}: WholesalePickListDrawerProps) {
  const [protocolChecked, setProtocolChecked] = useState(true);
  const [expiryChecked, setExpiryChecked] = useState(true);
  const [memoChecked, setMemoChecked] = useState(false);

  // Local mutable steps for fast pricing adjustment and barcode inward scanning
  const [steps, setSteps] = useState(manifest.walkingSteps);
  useEffect(() => {
    setSteps(manifest.walkingSteps);
  }, [manifest.walkingSteps]);

  // Barcode Scanner Inward State & Web Audio Synthesizer Beep
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const playBarcodeBeep = useCallback((freq = 880, duration = 0.12) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context fallback
    }
  }, []);

  // Refinement 2: Live Wholesale Manifest Cancellation Sync & Audio Warning
  const [cancelledOrders, setCancelledOrders] = useState<string[]>([]);
  const [cancelledSkus, setCancelledSkus] = useState<string[]>([]);
  const [syncingManifest, setSyncingManifest] = useState(false);

  // Refinement 3: Runner Discrepancy Carry-Over & Running Float Ledger
  const [previousDue, setPreviousDue] = useState<number>(0);

  const fetchRunnerDue = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/runners/reconcile?runnerName=${encodeURIComponent(manifest.runnerName || 'Shakil')}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPreviousDue(Number(json.data.totalDiscrepancy) || 0);
      }
    } catch {
      // Non-blocking
    }
  }, [manifest.runnerName]);

  const syncManifestCancellations = useCallback(async () => {
    try {
      setSyncingManifest(true);
      const allOrderNumbers = manifest.walkingSteps
        .flatMap((s) => s.orderAllocations.map((a) => a.orderNumber))
        .filter(Boolean);

      const params = new URLSearchParams();
      if (manifest.batchNumber) params.set('batchNumber', manifest.batchNumber);
      if (allOrderNumbers.length > 0) params.set('orderNumbers', allOrderNumbers.join(','));

      const res = await fetch(`/api/admin/shortlist/manifest-sync?${params.toString()}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success && json.data) {
        const newlyCancelled = (json.data.cancelledOrders as string[]).filter(
          (o) => !cancelledOrders.includes(o)
        );
        if (newlyCancelled.length > 0) {
          // Play prominent warning tones
          playBarcodeBeep(330, 0.25);
          setTimeout(() => playBarcodeBeep(260, 0.35), 280);
        }
        setCancelledOrders(json.data.cancelledOrders || []);
        setCancelledSkus(json.data.cancelledSkus || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setSyncingManifest(false);
    }
  }, [manifest.walkingSteps, manifest.batchNumber, cancelledOrders, playBarcodeBeep]);

  useEffect(() => {
    if (isOpen) {
      fetchRunnerDue();
      syncManifestCancellations();
      const interval = setInterval(syncManifestCancellations, 25000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchRunnerDue, syncManifestCancellations]);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeQuery.trim().toUpperCase();
    if (!query) return;

    const idx = steps.findIndex(
      (s) =>
        s.skuCode.toUpperCase() === query ||
        s.itemTitle.toUpperCase().includes(query) ||
        (query.length >= 4 && s.skuCode.toUpperCase().includes(query))
    );

    if (idx !== -1) {
      playBarcodeBeep(880, 0.14);
      setSteps((prev) => {
        const copy = [...prev];
        const target = { ...copy[idx] };
        target.unitsPicked = Math.min(target.totalUnitsRequired, target.unitsPicked + 1);
        copy[idx] = target;
        return copy;
      });
      setScanMessage(`✓ Barcode Verified: Inward Received +1 pc (${steps[idx].skuCode})`);
    } else {
      playBarcodeBeep(320, 0.22);
      setScanMessage(`⚠️ SKU or Barcode not matched in this batch: ${query}`);
    }

    setBarcodeQuery('');
    setTimeout(() => setScanMessage(null), 3500);
  };

  // Quick +/- Buy Price adjustments
  const handleQuickAdjustPrice = (stepIdx: number, delta: number) => {
    setSteps((prev) => {
      const copy = [...prev];
      const target = { ...copy[stepIdx] };
      target.unitCost = Math.max(0, target.unitCost + delta);
      target.totalCost = target.unitCost * target.totalUnitsRequired;
      copy[stepIdx] = target;
      return copy;
    });
  };

  // Runner Cash Reconciliation States
  const [cashGiven, setCashGiven] = useState<number>(manifest.totalCashFloat || 0);
  const [actualSpent, setActualSpent] = useState<number>(manifest.totalCashFloat || 0);
  const [cashReturned, setCashReturned] = useState<number>(0);
  const [runnerReconcileMsg, setRunnerReconcileMsg] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [dayEndSettling, setDayEndSettling] = useState(false);

  // Refinement 3: Effective Budget math
  const effectiveBudget = Math.max(0, Number((cashGiven - previousDue).toFixed(2)));
  const discrepancy = Number((cashGiven - (actualSpent + cashReturned)).toFixed(2));

  const handleSettleRunnerCash = async () => {
    setReconciling(true);
    try {
      const res = await fetch('/api/admin/runners/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          runnerName: manifest.runnerName || 'Shakil',
          cashGiven,
          actualSpent,
          cashReturned,
          notes: `Wholesale Batch #${manifest.batchNumber} runner settlement`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRunnerReconcileMsg(`✓ রানারের হিসাব সফলভাবে ক্লোজ হয়েছে (${json.data.status})`);
        fetchRunnerDue();
      } else {
        setRunnerReconcileMsg(`❌ এরর: ${json.error}`);
      }
    } catch (err: any) {
      setRunnerReconcileMsg(`❌ এরর: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  // 1-Click Day-End Multi-Trip Runner Settlement
  const handleDayEndBatchSettle = async () => {
    setDayEndSettling(true);
    try {
      const res = await fetch('/api/admin/runners/day-end-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          runnerName: manifest.runnerName || 'Shakil',
          notes: 'Multi-trip 1-click day-end reconciliation from Wholesale Drawer',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRunnerReconcileMsg(`✓ ${json.message}`);
        fetchRunnerDue();
      } else {
        setRunnerReconcileMsg(`❌ এরর: ${json.error}`);
      }
    } catch (err: any) {
      setRunnerReconcileMsg(`❌ এরর: ${err.message}`);
    } finally {
      setDayEndSettling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Drawer Blurred Backdrop */}
      <div
        id="drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[#02070f]/80 backdrop-blur-sm z-50 transition-opacity duration-300 opacity-100 cursor-pointer"
        aria-label="Close pick list drawer"
      />

      {/* Drawer Container */}
      <aside
        id="pick-list-drawer"
        className="fixed top-0 right-0 z-50 h-screen w-full max-w-[520px] bg-[#090d16] border-l border-[#232d42] shadow-2xl flex flex-col justify-between transform translate-x-0 transition-transform duration-300 ease-in-out font-sans overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1b263b] bg-[#0c1220]/90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <span className="text-[14px]">🧾</span>
                </div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Wholesale Pick List Manifest
                </h2>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-indigo-400 font-semibold">
                  Batch #{manifest.batchNumber}
                </span>
                <span>•</span>
                <span className="text-slate-300">{manifest.selectedSkusCount} SKUs</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {manifest.selectedUnitsCount} Units Selected
                </span>
              </p>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={syncManifestCancellations}
                disabled={syncingManifest}
                className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-[#1a2742] text-slate-300 hover:text-white border border-[#233352] transition-colors cursor-pointer"
                title="Sync cancellations"
              >
                <span className={`text-sm ${syncingManifest ? 'animate-spin inline-block' : ''}`}>🔄</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-[#1a2742] text-slate-300 hover:text-white border border-[#233352] transition-colors cursor-pointer"
                title="Print 80mm Slip"
              >
                <span className="text-sm">🖨️</span>
              </button>
              <button
                type="button"
                id="close-pick-list-btn"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#233352] transition-colors ml-1 cursor-pointer"
                title="Close Drawer (ESC)"
              >
                <span className="text-sm font-bold">✕</span>
              </button>
            </div>
          </div>

          {/* Summary KPI Strip inside Drawer */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#172338]">
            <div className="bg-[#0e1628] border border-[#1b2a45] rounded-lg p-2">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block font-semibold">
                To Source
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-extrabold text-white font-mono">
                  {manifest.selectedUnitsCount} pcs
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({manifest.selectedSkusCount} SKUs)
                </span>
              </div>
            </div>

            <div className="bg-[#0e1628] border border-[#1b2a45] rounded-lg p-2">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block font-semibold">
                Cash Float
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-extrabold text-amber-300 font-mono">
                  ৳{manifest.totalCashFloat.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-[#0e1628] border border-[#1b2a45] rounded-lg p-2">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400 block font-semibold">
                Hubs Covered
              </span>
              <div className="text-[11px] font-bold text-slate-200 mt-0.5 truncate font-mono">
                <span className="text-indigo-400">Paltan</span> &amp;{' '}
                <span className="text-emerald-400">Chawk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Scrollable Manifest Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080d17]">
          {/* Refinement 2: Live Cancellation Alert Banner */}
          {cancelledOrders.length > 0 && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-pulse">
              <span className="text-base leading-none">🚫</span>
              <div>
                <span className="font-bold block">Live Order Cancellation Detected!</span>
                <span className="text-[11px] text-rose-200/90 block mt-0.5">
                  Order(s) <strong>#{cancelledOrders.join(', #')}</strong> cancelled while runner is out.
                  Do NOT buy struck-out items!
                </span>
              </div>
            </div>
          )}

          {/* Barcode Scanner Inward Receiving Engine */}
          <div className="bg-[#0b1322] border border-indigo-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="text-sm">📷</span>
                <span>Inward Barcode Wedge Scanner</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                Audio Beep Enabled 🔔
              </span>
            </div>
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <input
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                placeholder="Scan barcode or enter SKU code (auto-picks on Enter)..."
                className="flex-1 h-8 px-2.5 rounded-lg bg-[#060c16] border border-[#20314a] focus:border-indigo-400 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Scan Pick
              </button>
            </form>
            {scanMessage && (
              <p
                className={`text-[11px] font-mono transition-all ${
                  scanMessage.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {scanMessage}
              </p>
            )}
          </div>

          {/* Route Sequence Indicator */}
          <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="text-indigo-400 text-xs">🛣️</span> Optimized Walking Route
            </span>
            <span className="text-emerald-400">
              {steps.length} Stop{steps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Steps Loop */}
          {steps.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0d1525] border border-[#1c2c47] text-slate-400 font-mono text-xs space-y-2">
              <span className="text-2xl block">🛒</span>
              <p className="text-slate-300 font-bold">No SKUs selected for this manifest</p>
              <p className="text-[11px] text-slate-500">
                Select items from the Wholesale Matrix table to generate the walking route.
              </p>
            </div>
          ) : (
            steps.map((step, sIdx) => {
              // Refinement 2: Check if this step is cancelled
              const isStepCancelled =
                cancelledSkus.includes(step.skuCode) ||
                (step.orderAllocations.length > 0 &&
                  step.orderAllocations.every((a) => cancelledOrders.includes(a.orderNumber)));

              // Refinement 4: Procurement Margin Guardian (< 20% margin alert / cost > 80% retail)
              const retailPrice = step.retailPrice || (step.unitCost > 0 ? Math.round(step.unitCost * 1.35) : 1000);
              const costRatio = retailPrice > 0 ? step.unitCost / retailPrice : 0;
              const isLowMargin = costRatio > 0.8;

              return (
                <div
                  key={step.stepIndex}
                  className={`border rounded-xl overflow-hidden shadow-lg transition-all ${
                    isStepCancelled
                      ? 'bg-rose-950/20 border-rose-500/50'
                      : 'bg-[#0d1525] border-[#1c2c47]'
                  }`}
                >
                  {/* Stop Header */}
                  <div
                    className={`px-3.5 py-2 border-b flex items-center justify-between ${
                      isStepCancelled
                        ? 'bg-rose-900/30 border-rose-500/30'
                        : 'bg-[#101b30] border-[#1c2c47]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${
                          isStepCancelled
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : step.stepIndex === 1
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        STOP 0{step.stepIndex}
                      </span>
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        {step.marketName}
                      </span>
                    </div>

                    {/* Struck-out or normal count */}
                    {isStepCancelled ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        🚫 CANCELLED - DO NOT BUY
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            step.stepIndex === 1 ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        ></span>{' '}
                        {step.unitsInStep} units
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 space-y-3">
                    {/* Vendor Info */}
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#15243d]">
                      <div>
                        <div className="text-xs font-bold text-white">
                          {step.vendorName}
                        </div>
                        <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-slate-400">📍</span>
                          {step.stallAddress}
                        </div>
                      </div>
                      <div className="text-right">
                        <a
                          href={`tel:${step.phone.replace(/[^0-9+]/g, '')}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#09101d] border border-[#1b2b46] text-indigo-300 hover:text-white text-[10px] font-mono font-semibold transition-colors"
                        >
                          <span className="text-[10px]">📞</span> {step.phone}
                        </a>
                        <span className="block text-[9px] text-slate-400 mt-0.5 font-mono">
                          {step.contactName}
                        </span>
                      </div>
                    </div>

                    {/* Item Details */}
                    <div
                      className={`border rounded-lg p-3 space-y-2.5 ${
                        isStepCancelled
                          ? 'bg-rose-950/10 border-rose-500/30'
                          : 'bg-[#080e1b] border-[#16253e]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-md bg-[#040810] border border-[#1b2d4b] overflow-hidden flex-shrink-0 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold">
                          {step.skuCode.slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-xs font-bold truncate ${
                                isStepCancelled ? 'line-through text-rose-300' : 'text-white'
                              }`}
                            >
                              {step.itemTitle}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded border font-mono text-[9px] font-semibold ${
                                isStepCancelled
                                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                  : step.stepIndex === 1
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                              }`}
                            >
                              {step.variantOrShade}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400">
                            <span
                              className={`font-semibold ${
                                isStepCancelled ? 'line-through text-rose-400' : 'text-indigo-400'
                              }`}
                            >
                              {step.skuCode}
                            </span>
                            <span>•</span>
                            <span>{step.volumeSpec}</span>
                          </div>
                        </div>
                      </div>

                      {/* Order Allocation Breakdown */}
                      <div className="space-y-1 pt-1 border-t border-[#132034]">
                        {step.orderAllocations.map((alloc, aIdx) => {
                          const isAllocCancelled = cancelledOrders.includes(alloc.orderNumber);
                          return (
                            <div
                              key={aIdx}
                              className={`flex items-center justify-between text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                isAllocCancelled
                                  ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                                  : 'bg-[#0b1322]'
                              }`}
                            >
                              <span
                                className={`truncate ${
                                  isAllocCancelled ? 'line-through text-rose-300' : 'text-indigo-400'
                                }`}
                              >
                                {alloc.orderNumber}{' '}
                                {alloc.shippingType ? `(${alloc.shippingType})` : ''}
                                {isAllocCancelled && ' [CANCELLED]'}
                              </span>
                              <span
                                className={
                                  isAllocCancelled
                                    ? 'text-rose-400 font-bold line-through'
                                    : alloc.shippingType === 'Express'
                                      ? 'text-rose-400 font-bold'
                                      : 'text-slate-300 font-bold'
                                }
                              >
                                {alloc.quantity} pc{alloc.quantity > 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Refinement 4: Procurement Margin Guardian Alert */}
                      {isLowMargin && !isStepCancelled && (
                        <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>⚠️</span>
                            <span>
                              <strong>Low Margin Warning (&lt;20%):</strong> Cost ৳{step.unitCost} is{' '}
                              {Math.round(costRatio * 100)}% of retail (৳{retailPrice})!
                            </span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 font-bold">
                            SURGE
                          </span>
                        </div>
                      )}

                      {/* Price & Picking Status with Quick +/- Buttons */}
                      <div className="pt-1 space-y-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-[10px]">
                              Cost: ৳{step.unitCost.toLocaleString()} ea •{' '}
                            </span>
                            <span className="text-amber-300 font-bold">
                              Total: ৳{step.totalCost.toLocaleString()}
                            </span>
                          </div>

                          {/* Quick Adjust Buttons */}
                          {!isStepCancelled && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustPrice(sIdx, -10)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-slate-300 font-mono transition-colors"
                                title="Decrease unit cost by ৳10"
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustPrice(sIdx, -5)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-slate-300 font-mono transition-colors"
                                title="Decrease unit cost by ৳5"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustPrice(sIdx, 5)}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-300 font-mono font-bold transition-colors"
                                title="Increase unit cost by ৳5"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustPrice(sIdx, 10)}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-300 font-mono font-bold transition-colors"
                                title="Increase unit cost by ৳10"
                              >
                                +10
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div
                            className={`flex items-center gap-1 text-[10px] font-semibold ${
                              step.unitsPicked > 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {step.unitsPicked > 0 ? '✓' : '○'} {step.unitsPicked} of{' '}
                              {step.totalUnitsRequired} picked
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#050a14] h-1.5 rounded-full overflow-hidden border border-[#15233c]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isStepCancelled
                              ? 'bg-rose-500'
                              : step.unitsPicked > 0
                                ? 'bg-emerald-400'
                                : 'bg-amber-400'
                          }`}
                          style={{
                            width: `${Math.round(
                              (step.unitsPicked / step.totalUnitsRequired) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Refinement 3: Runner Cash Reconciliation & Running Float Ledger Section */}
          <div className="bg-[#0b1220] border border-[#18263d] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <span className="text-emerald-400 text-sm">💵</span>
                <span>রানার রানিং ফ্লট ও ক্যাশ জবাবদিহিতা</span>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${
                  discrepancy === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {discrepancy === 0 ? 'হিসাব মিলেছে (৳০)' : `গরমিল: ৳${Math.abs(discrepancy)}`}
              </span>
            </div>

            {/* Float Carry-Over Breakdown Strip */}
            <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-[#070d17] border border-[#1a283e] text-[11px] font-mono">
              <div>
                <span className="text-[10px] text-gray-400 block">Morning Handover</span>
                <span className="font-bold text-white">৳{cashGiven.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-amber-400 block">Previous Due Carry</span>
                <span className="font-bold text-amber-300">
                  {previousDue > 0 ? `(-)৳${previousDue.toLocaleString()}` : '৳0'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block">Effective Budget</span>
                <span className="font-bold text-emerald-300">৳{effectiveBudget.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">হাতে দেওয়া টাকা</label>
                <input
                  type="number"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(Number(e.target.value) || 0)}
                  className="w-full bg-[#060c16] border border-[#20314a] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">মোট খরচ</label>
                <input
                  type="number"
                  value={actualSpent}
                  onChange={(e) => setActualSpent(Number(e.target.value) || 0)}
                  className="w-full bg-[#060c16] border border-[#20314a] rounded px-2 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">ফেরত টাকা</label>
                <input
                  type="number"
                  value={cashReturned}
                  onChange={(e) => setCashReturned(Number(e.target.value) || 0)}
                  className="w-full bg-[#060c16] border border-[#20314a] rounded px-2 py-1 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-400">
                {discrepancy === 0 ? (
                  <span className="text-emerald-400 font-semibold">✓ সম্পূর্ণ ক্যাশ ব্যালেন্স নির্ভুল</span>
                ) : discrepancy > 0 ? (
                  <span className="text-amber-400 font-semibold">⚠️ রানারের কাছে ৳{discrepancy} ফেরত পাওনা</span>
                ) : (
                  <span className="text-rose-400 font-semibold">⚠️ রানারের অতিরিক্ত খরচ ৳{Math.abs(discrepancy)}</span>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSettleRunnerCash}
                  disabled={reconciling || dayEndSettling}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold transition-all disabled:opacity-50 cursor-pointer"
                  title="Settle this single trip"
                >
                  {reconciling ? 'হিসাব হচ্ছে...' : 'হিসাব ক্লোজ করুন'}
                </button>

                <button
                  type="button"
                  onClick={handleDayEndBatchSettle}
                  disabled={reconciling || dayEndSettling}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  title="One-click settlement for all today's trips by this runner"
                >
                  {dayEndSettling ? 'সেটেল হচ্ছে...' : '⚡ ডে-এন্ড অল ট্রিপ সেটেল'}
                </button>
              </div>
            </div>

            {runnerReconcileMsg && (
              <p className="text-[10px] font-mono text-indigo-300 pt-1 border-t border-[#1b263b]">
                {runnerReconcileMsg}
              </p>
            )}
          </div>

          {/* Verification Checklist Note */}
          <div className="bg-[#0b1220] border border-[#18263d] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <span className="text-indigo-400 text-sm">🛡️</span>
                <span>Procurement Quality Protocol</span>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${
                  protocolChecked && expiryChecked && memoChecked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {protocolChecked && expiryChecked && memoChecked
                  ? '3/3 Protocol Cleared ✓'
                  : `${(protocolChecked ? 1 : 0) + (expiryChecked ? 1 : 0) + (memoChecked ? 1 : 0)}/3 Verification Pending`}
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={protocolChecked}
                  onChange={(e) => setProtocolChecked(e.target.checked)}
                  className="rounded bg-[#071321] border-[#20314a] text-indigo-600 focus:ring-0 mt-0.5 accent-indigo-600"
                />
                <span>Check manufacturer hologram &amp; batch seals on all boxes</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={expiryChecked}
                  onChange={(e) => setExpiryChecked(e.target.checked)}
                  className="rounded bg-[#071321] border-[#20314a] text-indigo-600 focus:ring-0 mt-0.5 accent-indigo-600"
                />
                <span>Expiry must be later than Dec 2026</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={memoChecked}
                  onChange={(e) => setMemoChecked(e.target.checked)}
                  className="rounded bg-[#071321] border-[#20314a] text-indigo-600 focus:ring-0 mt-0.5 accent-indigo-600"
                />
                <span>Collect signed Cash Float handover memo from merchant</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Drawer Actions */}
        <div className="p-3.5 bg-[#090f1d] border-t border-[#1c2c47] space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="open-thermal-preview-btn"
              onClick={onOpenThermalSlip}
              className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-sm">🖨️</span>
              <span>Print 80mm Pick Slip</span>
            </button>
            <button
              type="button"
              onClick={onMarkAcquired}
              className="flex-1 py-2 px-3 rounded-lg bg-[#14233c] hover:bg-[#1d3255] border border-[#213860] text-emerald-400 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <span className="text-xs">✓✓</span>
              <span>Mark Acquired (৳{manifest.totalCashFloat.toLocaleString()})</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5 px-1">
            <button
              type="button"
              id="close-drawer-text-btn"
              onClick={onClose}
              className="hover:text-slate-200 underline transition-colors cursor-pointer"
            >
              Close / Return to Dashboard
            </button>
            <span>
              Runner:{' '}
              <strong className="text-slate-200">
                Rig #04 ({manifest.runnerName})
              </strong>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
