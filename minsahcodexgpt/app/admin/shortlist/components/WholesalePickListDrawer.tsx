// app/admin/shortlist/components/WholesalePickListDrawer.tsx
// Primary Wholesale Pick List Manifest Slide-Over Drawer matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)
// Decomposed into declarative atomic components (Loop 5)

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WholesalePickListManifestData } from '../types';
import { PickListDrawerHeader } from '@/components/admin/shortlist/desktop/manifest/PickListDrawerHeader';
import { ManifestBarcodeScannerInput } from '@/components/admin/shortlist/desktop/manifest/ManifestBarcodeScannerInput';
import { playShortlistAudioBeep } from '@/components/admin/shortlist/desktop/manifest/ManifestWebAudioAlertEngine';
import { ManifestCancellationAlertBanner } from '@/components/admin/shortlist/desktop/manifest/ManifestCancellationAlertBanner';
import { RunnerFloatDiscrepancyCard } from '@/components/admin/shortlist/desktop/manifest/RunnerFloatDiscrepancyCard';
import { ProtocolChecklistGroup } from '@/components/admin/shortlist/desktop/manifest/ProtocolChecklistGroup';
import { WalkingRouteStopContainer } from '@/components/admin/shortlist/desktop/manifest/WalkingRouteStopContainer';
import { PickListDrawerFooter } from '@/components/admin/shortlist/desktop/manifest/PickListDrawerFooter';

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

  // Barcode Scanner Inward State
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Live Wholesale Manifest Cancellation Sync & Audio Warning
  const [cancelledOrders, setCancelledOrders] = useState<string[]>([]);
  const [cancelledSkus, setCancelledSkus] = useState<string[]>([]);
  const [syncingManifest, setSyncingManifest] = useState(false);

  // Runner Discrepancy Carry-Over & Running Float Ledger
  const [previousDue, setPreviousDue] = useState<number>(0);

  const fetchRunnerDue = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/runners/reconcile?runnerName=${encodeURIComponent(manifest.runnerName || 'Shakil')}`,
        { credentials: 'include' }
      );
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
          playShortlistAudioBeep(330, 0.25);
          setTimeout(() => playShortlistAudioBeep(260, 0.35), 280);
        }
        setCancelledOrders(json.data.cancelledOrders || []);
        setCancelledSkus(json.data.cancelledSkus || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setSyncingManifest(false);
    }
  }, [manifest.walkingSteps, manifest.batchNumber, cancelledOrders]);

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
      playShortlistAudioBeep(880, 0.14);
      setSteps((prev) => {
        const copy = [...prev];
        const target = { ...copy[idx] };
        target.unitsPicked = Math.min(target.totalUnitsRequired, target.unitsPicked + 1);
        copy[idx] = target;
        return copy;
      });
      setScanMessage(`✓ Barcode Verified: Inward Received +1 pc (${steps[idx].skuCode})`);
    } else {
      playShortlistAudioBeep(320, 0.22);
      setScanMessage(`⚠️ SKU or Barcode not matched in this batch: ${query}`);
    }

    setBarcodeQuery('');
    setTimeout(() => setScanMessage(null), 3500);
  };

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

  const handleIncrementPicked = (stepIdx: number) => {
    setSteps((prev) => {
      const copy = [...prev];
      const target = { ...copy[stepIdx] };
      target.unitsPicked = Math.min(target.totalUnitsRequired, target.unitsPicked + 1);
      copy[stepIdx] = target;
      return copy;
    });
    playShortlistAudioBeep(880, 0.1);
  };

  // Runner Cash Reconciliation States
  const [cashGiven, setCashGiven] = useState<number>(manifest.totalCashFloat || 0);
  const [actualSpent, setActualSpent] = useState<number>(manifest.totalCashFloat || 0);
  const [cashReturned, setCashReturned] = useState<number>(0);
  const [runnerReconcileMsg, setRunnerReconcileMsg] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [dayEndSettling, setDayEndSettling] = useState(false);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setRunnerReconcileMsg(`❌ এরর: ${msg}`);
    } finally {
      setReconciling(false);
    }
  };

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setRunnerReconcileMsg(`❌ এরর: ${msg}`);
    } finally {
      setDayEndSettling(false);
    }
  };

  if (!isOpen) return null;

  const totalCalculatedCost = steps.reduce((sum, s) => sum + s.totalCost, 0);

  return (
    <>
      {/* Drawer Blurred Backdrop */}
      <div
        id="drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[#02070f]/80 backdrop-blur-xs z-50 transition-opacity duration-300 opacity-100 cursor-pointer"
        aria-label="Close pick list drawer"
      />

      {/* Drawer Container */}
      <aside
        id="pick-list-drawer"
        className="fixed top-0 right-0 z-50 h-screen w-full max-w-[520px] bg-[#090d16] border-l border-[#232d42] shadow-2xl flex flex-col justify-between transform translate-x-0 transition-transform duration-300 ease-in-out font-sans overflow-hidden"
      >
        {/* Header */}
        <PickListDrawerHeader
          batchNumber={manifest.batchNumber}
          selectedUnitsCount={manifest.selectedUnitsCount}
          hubsCovered={manifest.hubsCovered}
          onOpenThermalSlip={onOpenThermalSlip}
          onClose={onClose}
        />

        {/* Barcode Scanner Inward */}
        <ManifestBarcodeScannerInput
          barcodeQuery={barcodeQuery}
          onBarcodeQueryChange={setBarcodeQuery}
          onSubmit={handleBarcodeSubmit}
          scanMessage={scanMessage}
        />

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {/* Order Cancellation Alert Banner */}
          <ManifestCancellationAlertBanner
            cancelledOrders={cancelledOrders}
            cancelledSkus={cancelledSkus}
            syncingManifest={syncingManifest}
            onRefreshSync={syncManifestCancellations}
          />

          {/* Runner Float & Reconciliation */}
          <RunnerFloatDiscrepancyCard
            runnerName={manifest.runnerName}
            runnerCode={manifest.runnerCode}
            cashGiven={cashGiven}
            actualSpent={actualSpent}
            cashReturned={cashReturned}
            previousDue={previousDue}
            onCashGivenChange={setCashGiven}
            onActualSpentChange={setActualSpent}
            onCashReturnedChange={setCashReturned}
            onSettleRunnerCash={handleSettleRunnerCash}
            onDayEndBatchSettle={handleDayEndBatchSettle}
            reconciling={reconciling}
            dayEndSettling={dayEndSettling}
            reconcileMsg={runnerReconcileMsg}
          />

          {/* Walking Route Stops List */}
          <div className="mx-4 space-y-3">
            <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Walking Itinerary ({steps.length} Items)</span>
              <span className="text-indigo-400 text-[10px]">Auto-clustered by stall</span>
            </div>

            {steps.map((step, idx) => (
              <WalkingRouteStopContainer
                key={idx}
                step={step}
                stepIndex={idx}
                onAdjustPrice={handleQuickAdjustPrice}
                onIncrementPicked={handleIncrementPicked}
              />
            ))}
          </div>

          {/* Protocol Checklist */}
          <ProtocolChecklistGroup
            protocolChecked={protocolChecked}
            expiryChecked={expiryChecked}
            memoChecked={memoChecked}
            onProtocolChange={setProtocolChecked}
            onExpiryChange={setExpiryChecked}
            onMemoChange={setMemoChecked}
          />
        </div>

        {/* Footer */}
        <PickListDrawerFooter
          totalUnits={manifest.selectedUnitsCount}
          totalCost={totalCalculatedCost}
          onMarkAcquired={onMarkAcquired}
        />
      </aside>
    </>
  );
}
