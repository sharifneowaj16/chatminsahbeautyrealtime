// app/admin/shortlist/components/ThermalPickSlipDrawer.tsx
// Secondary 80mm ESC/POS Thermal Receipt Slide-Over Drawer matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)
// Decomposed into declarative atomic components (Loop 5)

'use client';

import React from 'react';
import { ThermalReceiptPayload } from '../types';
import { ThermalSlipDrawerHeader } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipDrawerHeader';
import { ThermalSlipPaperContainer } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipPaperContainer';
import { ThermalSlipStoreHeader } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipStoreHeader';
import { ThermalSlipRouteItinerary } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipRouteItinerary';
import { ThermalSlipItemLine } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipItemLine';
import { ThermalSlipSummaryTotals } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipSummaryTotals';
import { ThermalSlipSignatures } from '@/components/admin/shortlist/desktop/thermal/ThermalSlipSignatures';

interface ThermalPickSlipDrawerProps {
  isOpen: boolean;
  onBackToManifest: () => void;
  onClose: () => void;
  receiptData: ThermalReceiptPayload;
}

export default function ThermalPickSlipDrawer({
  isOpen,
  onBackToManifest,
  onClose,
  receiptData,
}: ThermalPickSlipDrawerProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Secondary Backdrop */}
      <div
        id="thermal-drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[#02070f]/60 backdrop-blur-xs z-50 transition-opacity duration-300 opacity-100 cursor-pointer"
        aria-label="Close thermal drawer"
      />

      {/* Drawer Panel */}
      <aside
        id="thermal-drawer"
        className="fixed top-0 right-0 z-50 h-screen w-full max-w-[440px] bg-[#070c14] border-l border-[#20314a] shadow-2xl flex flex-col justify-between transform translate-x-0 transition-transform duration-300 ease-in-out font-sans overflow-hidden"
      >
        {/* Header */}
        <ThermalSlipDrawerHeader
          onBackToManifest={onBackToManifest}
          onPrint={handlePrint}
          onClose={onClose}
        />

        {/* Scrollable Thermal Slip Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#050911] flex justify-center">
          <ThermalSlipPaperContainer>
            {/* Store & Hub Header */}
            <ThermalSlipStoreHeader
              rigId={receiptData.rigId}
              hubLocation={receiptData.hubLocation}
              dateTimeStr={receiptData.dateTimeStr}
              slipNumber={receiptData.slipNumber}
            />

            {/* Walking Route Itinerary */}
            <ThermalSlipRouteItinerary stops={receiptData.walkingRouteSummary} />

            {/* Table Header */}
            <div className="py-1.5 border-b border-slate-800 text-[10px] font-bold flex justify-between uppercase">
              <span>SKU / PRODUCT / ORDERS</span>
              <span className="text-right">QTY x BDT</span>
            </div>

            {/* Items List */}
            <div className="py-2 border-b-2 border-dashed border-slate-700 space-y-2.5">
              {receiptData.lineItems.map((item, iIdx) => (
                <ThermalSlipItemLine key={iIdx} item={item} />
              ))}
            </div>

            {/* Totals & Cash Float */}
            <ThermalSlipSummaryTotals
              totalUnits={receiptData.totalUnits}
              totalSkus={receiptData.totalSkus}
              requiredCashFloat={receiptData.requiredCashFloat}
              settlementMethod={receiptData.settlementMethod}
            />

            {/* Simulated Barcode & Signatures */}
            <ThermalSlipSignatures
              barcodeString={receiptData.barcodeString}
              runnerName={receiptData.runnerName}
              dispatchInCharge={receiptData.dispatchInCharge}
            />
          </ThermalSlipPaperContainer>
        </div>

        {/* Sticky Bottom Controls */}
        <div className="p-3.5 bg-[#090f1d] border-t border-[#1c2c47] space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <span className="text-sm">🖨️</span>
              <span>Print Now (ESC/POS)</span>
            </button>
            <button
              type="button"
              id="cancel-thermal-btn"
              onClick={onBackToManifest}
              className="py-2 px-3 rounded-lg bg-[#14233c] hover:bg-[#1d3255] border border-[#213860] text-slate-300 hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span className="text-sm">←</span>
              <span>Back</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5 px-1">
            <span>
              Target: <strong className="text-slate-200">Thermal 80mm ESC/POS</strong>
            </span>
            <span>
              Speed: <strong className="text-emerald-400 font-semibold">250mm/s</strong>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
