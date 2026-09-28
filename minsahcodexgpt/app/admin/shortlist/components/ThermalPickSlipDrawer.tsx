// app/admin/shortlist/components/ThermalPickSlipDrawer.tsx
// Secondary 80mm ESC/POS Thermal Receipt Slide-Over Drawer matching Stitch Ground Truth (Screen ID: 46092511627045dd9f65eaa0328dd890)

'use client';

import React from 'react';
import { ThermalReceiptPayload } from '../types';

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
      {/* 80mm Thermal Receipt Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-80mm-slip, #printable-80mm-slip * {
            visibility: visible !important;
          }
          #printable-80mm-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

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
        <div className="p-3.5 border-b border-[#1b263b] bg-[#0c1220]/95 backdrop-blur-md flex-shrink-0 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="back-to-manifest-btn"
                onClick={onBackToManifest}
                className="p-1 rounded-md bg-[#132034] hover:bg-[#1c2c47] text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Back to Manifest"
              >
                <span className="text-sm">←</span>
              </button>
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                80mm Pick Slip Preview{' '}
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold border border-indigo-500/30">
                  LIVE
                </span>
              </h3>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1 ml-7">
              <span>ESC/POS 80mm</span>
              <span>•</span>
              <span>203 DPI</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Ready</span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-[#1a2742] text-slate-300 hover:text-white border border-[#233352] transition-colors cursor-pointer"
              title="Print Immediately"
            >
              <span className="text-sm">🖨️</span>
            </button>
            <button
              type="button"
              id="close-thermal-drawer-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#233352] transition-colors cursor-pointer"
              title="Close Drawer (ESC)"
            >
              <span className="text-sm font-bold">✕</span>
            </button>
          </div>
        </div>

        {/* Scrollable Thermal Slip Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#050911] flex justify-center">
          {/* 80mm Realistic Thermal Receipt Simulation Container */}
          <div
            id="printable-80mm-slip"
            className="w-full max-w-[360px] bg-[#fdfdfc] text-[#0f172a] shadow-2xl rounded-xs p-4 font-mono text-[11px] leading-relaxed relative flex flex-col select-all border border-slate-300"
          >
            {/* Top Paper Notch / Cut indicator */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-slate-400">
              <span className="text-[9px] uppercase tracking-widest text-slate-700 font-bold">
                *** ESC/POS 80MM SLIP ***
              </span>
              <span className="text-[9px] font-bold text-slate-700">
                {receiptData.rigId}
              </span>
            </div>

            {/* Store Header */}
            <div className="text-center space-y-0.5 pb-2.5 border-b-2 border-dashed border-slate-700">
              <div className="text-sm font-extrabold tracking-tight uppercase text-black font-sans">
                MINSAH BEAUTY OPS
              </div>
              <div className="text-[10px] font-bold uppercase text-slate-700">
                Wholesale Sourcing Manifest
              </div>
              <div className="text-[9px] text-slate-700 font-bold mt-1">
                {receiptData.hubLocation}
              </div>
              <div className="text-[9px] text-slate-700 font-bold">
                {receiptData.dateTimeStr} • Slip: #{receiptData.slipNumber}
              </div>
            </div>

            {/* Route Sequence */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
              <div className="text-[9px] font-extrabold uppercase tracking-wide text-slate-700">
                WALKING ROUTE: {receiptData.walkingRouteSummary.length} STOPS
              </div>
              {receiptData.walkingRouteSummary.map((stop, sIdx) => (
                <div key={sIdx} className="text-[10px] font-bold text-black">
                  {stop}
                </div>
              ))}
            </div>

            {/* Table Header */}
            <div className="py-1.5 border-b border-slate-800 text-[10px] font-bold flex justify-between uppercase">
              <span>SKU / PRODUCT / ORDERS</span>
              <span className="text-right">QTY x BDT</span>
            </div>

            {/* Items List */}
            <div className="py-2 border-b-2 border-dashed border-slate-700 space-y-2.5">
              {receiptData.lineItems.map((item, iIdx) => (
                <div key={iIdx} className="space-y-0.5">
                  <div className="flex justify-between items-start font-bold text-black">
                    <span className="text-[11px] leading-snug">{item.title}</span>
                    <span className="font-extrabold">
                      {item.qty}x ৳{item.unitPrice}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-700 font-bold">
                    <span>
                      {item.skuCode} • {item.shadeOrType} • {item.volumeSpec}
                    </span>
                    <span className="text-black font-extrabold">
                      ৳{item.totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[8.5px] text-slate-700 bg-slate-200/80 px-1 py-0.5 rounded-xs mt-0.5 font-bold">
                    Alloc: {item.orderRefs.join(' + ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Float Box */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-800 space-y-1 font-bold">
              <div className="flex justify-between text-[11px] font-bold text-slate-800">
                <span>TOTAL UNITS TO PICK:</span>
                <span className="text-black font-extrabold">
                  {receiptData.totalUnits} PCS ({receiptData.totalSkus} SKUs)
                </span>
              </div>
              <div className="flex justify-between text-xs font-black text-black pt-1 border-t border-slate-300">
                <span>REQUIRED CASH FLOAT:</span>
                <span className="text-sm font-black">
                  ৳{receiptData.requiredCashFloat.toLocaleString()} BDT
                </span>
              </div>
              <div className="text-[9px] text-slate-700 pt-0.5 font-bold">
                Settlement Method: {receiptData.settlementMethod}
              </div>
            </div>

            {/* Simulated High Density Barcode */}
            <div className="py-3 text-center space-y-1">
              <div className="w-full flex justify-center py-1">
                <svg
                  className="w-48 h-10"
                  preserveAspectRatio="none"
                  viewBox="0 0 160 36"
                >
                  <rect fill="#0f172a" height="36" width="2" x="4"></rect>
                  <rect fill="#0f172a" height="36" width="4" x="8"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="14"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="17"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="22"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="25"></rect>
                  <rect fill="#0f172a" height="36" width="5" x="30"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="37"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="41"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="46"></rect>
                  <rect fill="#0f172a" height="36" width="4" x="49"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="55"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="59"></rect>
                  <rect fill="#0f172a" height="36" width="4" x="62"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="68"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="72"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="77"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="81"></rect>
                  <rect fill="#0f172a" height="36" width="4" x="84"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="90"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="94"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="99"></rect>
                  <rect fill="#0f172a" height="36" width="5" x="102"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="109"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="113"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="116"></rect>
                  <rect fill="#0f172a" height="36" width="4" x="121"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="127"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="130"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="135"></rect>
                  <rect fill="#0f172a" height="36" width="4" x="139"></rect>
                  <rect fill="#0f172a" height="36" width="2" x="145"></rect>
                  <rect fill="#0f172a" height="36" width="3" x="149"></rect>
                  <rect fill="#0f172a" height="36" width="1" x="154"></rect>
                </svg>
              </div>
              <div className="text-[9px] font-mono tracking-widest text-slate-800 font-bold">
                {receiptData.barcodeString}
              </div>
            </div>

            {/* Quality & Handover Signature Lines */}
            <div className="pt-2 border-t border-dashed border-slate-400 space-y-2 text-[9px] text-slate-700 font-bold">
              <div className="flex justify-between items-center">
                <span className="uppercase">QC Seal Hologram:</span>
                <span className="font-black text-black">[ VERIFIED ]</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="border-b border-dotted border-slate-600 pb-1 text-center">
                  <span className="block text-[8px] text-slate-600 font-semibold">
                    Runner: {receiptData.runnerName}
                  </span>
                </div>
                <div className="border-b border-dotted border-slate-600 pb-1 text-center">
                  <span className="block text-[8px] text-slate-600 font-semibold">
                    {receiptData.dispatchInCharge}
                  </span>
                </div>
              </div>
              <div className="text-center text-[8px] text-slate-600 pt-1">
                MINSAH SOURCING TERMINAL • DHAKA HUB
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Controls for Secondary Thermal Drawer */}
        <div className="p-3.5 bg-[#090f1d] border-t border-[#1c2c47] space-y-2 flex-shrink-0">
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
