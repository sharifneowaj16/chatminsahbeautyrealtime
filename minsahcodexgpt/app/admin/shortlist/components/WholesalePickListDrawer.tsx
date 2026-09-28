// app/admin/shortlist/components/WholesalePickListDrawer.tsx
// Primary Wholesale Pick List Manifest Slide-Over Drawer matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)

'use client';

import React, { useState } from 'react';
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
        className="fixed top-0 right-0 z-50 h-screen w-full max-w-[500px] bg-[#090d16] border-l border-[#232d42] shadow-2xl flex flex-col justify-between transform translate-x-0 transition-transform duration-300 ease-in-out font-sans overflow-hidden"
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
                onClick={() => window.print()}
                className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-[#1a2742] text-slate-300 hover:text-white border border-[#233352] transition-colors cursor-pointer"
                title="Print 80mm Slip"
              >
                <span className="text-sm">🖨️</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-[#1a2742] text-slate-300 hover:text-white border border-[#233352] transition-colors cursor-pointer"
                title="Download PDF"
              >
                <span className="text-sm">📄</span>
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
          {/* Route Sequence Indicator */}
          <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="text-indigo-400 text-xs">🛣️</span> Optimized Walking Route
            </span>
            <span className="text-emerald-400">
              {manifest.walkingSteps.length} Stop{manifest.walkingSteps.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Empty State if no steps */}
          {manifest.walkingSteps.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0d1525] border border-[#1c2c47] text-slate-400 font-mono text-xs space-y-2">
              <span className="text-2xl block">🛒</span>
              <p className="text-slate-300 font-bold">No SKUs selected for this manifest</p>
              <p className="text-[11px] text-slate-500">
                Select items from the Wholesale Matrix table to generate the walking route.
              </p>
            </div>
          ) : (
            manifest.walkingSteps.map((step) => (
              <div
                key={step.stepIndex}
                className="bg-[#0d1525] border border-[#1c2c47] rounded-xl overflow-hidden shadow-lg"
              >
              {/* Stop Header */}
              <div className="bg-[#101b30] px-3.5 py-2 border-b border-[#1c2c47] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${
                      step.stepIndex === 1
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
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      step.stepIndex === 1 ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></span>{' '}
                  {step.unitsInStep} units
                </span>
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
                <div className="bg-[#080e1b] border border-[#16253e] rounded-lg p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-md bg-[#040810] border border-[#1b2d4b] overflow-hidden flex-shrink-0 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold">
                      {step.skuCode.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {step.itemTitle}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded border font-mono text-[9px] font-semibold ${
                            step.stepIndex === 1
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                              : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                          }`}
                        >
                          {step.variantOrShade}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400">
                        <span className="text-indigo-400 font-semibold">
                          {step.skuCode}
                        </span>
                        <span>•</span>
                        <span>{step.volumeSpec}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Allocation Breakdown */}
                  <div className="space-y-1 pt-1 border-t border-[#132034]">
                    {step.orderAllocations.map((alloc, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex items-center justify-between text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0b1322]"
                      >
                        <span className="text-indigo-400 truncate">
                          {alloc.orderNumber}{' '}
                          {alloc.shippingType ? `(${alloc.shippingType})` : ''}
                        </span>
                        <span
                          className={
                            alloc.shippingType === 'Express'
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-300 font-bold'
                          }
                        >
                          {alloc.quantity} pc{alloc.quantity > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Warning Alert if present */}
                  {step.warningAlert && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-300">
                      <span className="text-[12px]">⏱️</span>
                      <span>{step.warningAlert}</span>
                    </div>
                  )}

                  {/* Price & Picking Status */}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px]">
                        Cost: ৳{step.unitCost.toLocaleString()} ea •{' '}
                      </span>
                      <span className="text-amber-300 font-bold">
                        Total: ৳{step.totalCost.toLocaleString()}
                      </span>
                    </div>
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

                  {/* Progress Bar */}
                  <div className="w-full bg-[#050a14] h-1.5 rounded-full overflow-hidden border border-[#15233c]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        step.unitsPicked > 0 ? 'bg-emerald-400' : 'bg-amber-400'
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
          ))
        )}

          {/* Verification Checklist Note */}
          <div className="bg-[#0b1220] border border-[#18263d] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <span className="text-indigo-400 text-sm">🛡️</span>
                <span>Procurement Quality Protocol</span>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded border font-bold ${
                  (protocolChecked && expiryChecked && memoChecked)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {(protocolChecked && expiryChecked && memoChecked)
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
