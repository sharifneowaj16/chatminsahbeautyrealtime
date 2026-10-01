// app/admin/shortlist/components/mobile/MobileThermalSlipModal.tsx
// Unified 80mm ESC/POS Thermal Slip — driven by shared ThermalReceiptPayload engine
// Pixel-parity for Stitch Screens 7 & 8 PLUS real window.print() via @media print
// Replaces single-SKU simulation with full multi-item batch payload from walkingRouteEngine

'use client';

import React, { useState, useMemo } from 'react';
import { ThermalReceiptPayload } from '../../types';
import {
  X,
  Printer,
  Share2,
  CheckCircle,
  Copy,
  MessageSquare,
  Smartphone,
  Check,
  ChevronRight,
  RotateCcw,
  Receipt,
  Link,
  ArrowLeft,
  CheckSquare,
} from 'lucide-react';

interface MobileThermalSlipModalProps {
  receiptData: ThermalReceiptPayload;
  isOpen: boolean;
  onClose: () => void;
  onPrintSuccess?: () => void;
}

export default function MobileThermalSlipModal({
  receiptData,
  isOpen,
  onClose,
  onPrintSuccess,
}: MobileThermalSlipModalProps) {
  const [isPrinted, setIsPrinted] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const printDateTime = useMemo(() => {
    const now = new Date();
    const dateStr = now
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} • ${timeStr}`;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrint = () => {
    // Haptic feedback on supported devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
    setIsPrinted(true);
    showToast(`ESC/POS Command Dispatched (৳${receiptData.requiredCashFloat.toLocaleString()} BDT)`);
    // Trigger real browser print dialog (the @media print CSS isolates the slip)
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setShowSuccessModal(true);
        if (onPrintSuccess) onPrintSuccess();
      }, 400);
    }, 100);
  };

  const handleReprint = () => {
    setShowSuccessModal(false);
    setTimeout(() => {
      showToast('Reprinting Slip via Bluetooth (203 DPI)...');
      window.print();
      setTimeout(() => setShowSuccessModal(true), 500);
    }, 200);
  };

  const handleCopyPayload = () => {
    const firstStop = receiptData.walkingRouteSummary[0] ?? 'Hub';
    const payload = `MINSAH OPS #${receiptData.slipNumber} | ${firstStop} | ${receiptData.totalUnits} PCS | ৳${receiptData.requiredCashFloat.toLocaleString()} BDT`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(payload);
    }
    showToast('Slip Payload Copied to Clipboard');
  };

  const handleSmsRunner = () => {
    showToast(`SMS Dispatched to Runner ${receiptData.runnerName}`);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end bg-[#010f1f]/85 backdrop-blur-md transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 80mm Thermal Receipt Print CSS — isolated to #mobile-printable-80mm-slip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #mobile-printable-80mm-slip,
          #mobile-printable-80mm-slip * {
            visibility: visible !important;
          }
          #mobile-printable-80mm-slip {
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

      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Slide-Up Modal Body */}
      <div
        className={`relative w-full max-h-[95vh] bg-[#051424] border-t border-[#172a3e] rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden transition-transform duration-300 ease-out z-10 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Top Navigation & Action Context Bar */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#172a3e] bg-[#0d1c2d] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white active:opacity-70 transition text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Shortlist</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] tracking-wide font-bold">203 DPI • READY</span>
            </span>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="w-8 h-8 rounded-lg bg-[#122131] flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition"
              aria-label="Share Slip"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#122131] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {/* Operational Context Header */}
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold tracking-tight text-white">Thermal Pick Slip</h1>
              <span className="font-mono text-xs text-indigo-400 font-bold">80mm ESC/POS</span>
            </div>
            {/* Metadata Pill Sequence */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded bg-[#122131] text-slate-300 font-mono text-[10px] font-semibold">
                {receiptData.totalSkus === 1 ? 'SINGLE ITEM MANIFEST' : `${receiptData.totalSkus}-SKU BATCH MANIFEST`}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#122131] text-indigo-400 font-mono text-[10px] font-bold">
                #{receiptData.slipNumber}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#122131] text-amber-300 font-mono text-[10px] font-semibold uppercase">
                {receiptData.hubLocation}
              </span>
            </div>
          </div>

          {/* Authentic 80mm ESC/POS White Thermal Paper Card Preview */}
          <div className="my-1">
            <div
              id="mobile-printable-80mm-slip"
              className="relative w-full bg-[#fcfcfc] text-[#0f172a] rounded-t-lg shadow-2xl p-5 font-mono select-none overflow-hidden"
            >
              {/* Receipt Brand Banner */}
              <div className="relative text-center pb-3 border-b-2 border-dashed border-[#1e293b]/20">
                <div className="text-sm tracking-wider font-extrabold text-[#090d16] uppercase font-sans">
                  MINSAH BEAUTY OPS
                </div>
                <div className="text-[10px] tracking-widest text-[#334155] font-bold mt-0.5">
                  WHOLESALE SOURCING SLIP
                </div>
                <div className="text-[11px] text-[#475569] mt-0.5 font-medium">
                  {receiptData.hubLocation}
                </div>
              </div>

              {/* Dispatch Timestamp & Rig Info */}
              <div className="relative py-2 flex justify-between items-center text-[11px] text-[#334155] font-semibold border-b border-[#cbd5e1]">
                <div>{receiptData.dateTimeStr}</div>
                <div className="px-1.5 py-0.5 bg-[#e2e8f0] rounded text-[#0f172a] font-bold">
                  {receiptData.rigId} : {receiptData.runnerName.toUpperCase()}
                </div>
              </div>

              {/* Walking Route Summary */}
              {receiptData.walkingRouteSummary.length > 0 && (
                <div className="relative py-2.5 border-b border-[#cbd5e1] space-y-1">
                  <div className="text-[9px] text-[#64748b] tracking-wider uppercase font-bold">
                    WALKING ROUTE — {receiptData.walkingRouteSummary.length} STOP{receiptData.walkingRouteSummary.length !== 1 ? 'S' : ''}
                  </div>
                  {receiptData.walkingRouteSummary.map((stop, idx) => (
                    <div key={idx} className="text-[10px] font-bold text-[#0f172a]">
                      {stop}
                    </div>
                  ))}
                </div>
              )}

              {/* Multi-item SKU Line Items */}
              <div className="relative py-3 border-b-2 border-dashed border-[#1e293b]/20 space-y-3">
                <div className="flex justify-between text-[9px] text-[#64748b] font-bold uppercase tracking-wider pb-1 border-b border-[#e2e8f0]">
                  <span>SKU / PRODUCT</span>
                  <span>QTY × BDT</span>
                </div>
                {receiptData.lineItems.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] bg-[#090d16] text-[#ffffff] px-1.5 py-0.5 rounded font-bold tracking-wider">
                          SKU: {item.skuCode}
                        </span>
                        <div className="text-[13px] leading-tight font-extrabold text-[#090d16] mt-1 font-sans">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-[#475569] font-medium mt-0.5">
                          {item.shadeOrType}
                          {item.volumeSpec ? ` • ${item.volumeSpec}` : ''}
                        </div>
                        {item.orderRefs.length > 0 && (
                          <div className="text-[9px] text-[#64748b] bg-[#f1f5f9] px-1 py-0.5 rounded mt-0.5 font-bold">
                            Alloc: {item.orderRefs.join(' + ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl leading-none font-extrabold text-[#090d16]">
                          {item.qty}
                        </div>
                        <div className="text-[10px] font-bold text-[#475569]">PCS</div>
                        <div className="text-[11px] font-black text-[#090d16] mt-0.5">
                          ৳{item.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals Block */}
              <div className="relative py-2.5 border-b-2 border-dashed border-[#1e293b]/20 space-y-1">
                <div className="flex justify-between items-center text-[11px] text-[#475569]">
                  <span>Total Units</span>
                  <span className="font-bold text-[#0f172a]">
                    {receiptData.totalUnits} PCS ({receiptData.totalSkus} SKUs)
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <div>
                    <div className="text-[10px] font-extrabold tracking-wider uppercase text-[#090d16]">
                      CASH PAYOUT REQUIRED
                    </div>
                    <div className="text-[10px] text-[#64748b] font-medium">
                      Float Source: {receiptData.rigId}
                    </div>
                  </div>
                  <div className="text-xl font-black text-[#090d16]">
                    ৳{receiptData.requiredCashFloat.toLocaleString()}
                  </div>
                </div>
                <div className="text-[9px] text-[#64748b] font-medium">
                  Settlement: {receiptData.settlementMethod}
                </div>
              </div>

              {/* Scannable High-Density Barcode Block */}
              <div className="relative pt-3 pb-2 flex flex-col items-center justify-center">
                <svg className="w-full h-12" fill="#090d16" preserveAspectRatio="none" viewBox="0 0 240 60">
                  <rect height="52" width="3" x="0" y="0" />
                  <rect height="52" width="2" x="5" y="0" />
                  <rect height="52" width="4" x="9" y="0" />
                  <rect height="52" width="2" x="16" y="0" />
                  <rect height="52" width="5" x="20" y="0" />
                  <rect height="52" width="2" x="27" y="0" />
                  <rect height="52" width="3" x="31" y="0" />
                  <rect height="52" width="6" x="36" y="0" />
                  <rect height="52" width="2" x="44" y="0" />
                  <rect height="52" width="4" x="48" y="0" />
                  <rect height="52" width="2" x="55" y="0" />
                  <rect height="52" width="5" x="59" y="0" />
                  <rect height="52" width="3" x="66" y="0" />
                  <rect height="52" width="2" x="71" y="0" />
                  <rect height="52" width="6" x="75" y="0" />
                  <rect height="52" width="2" x="83" y="0" />
                  <rect height="52" width="4" x="87" y="0" />
                  <rect height="52" width="3" x="93" y="0" />
                  <rect height="52" width="5" x="98" y="0" />
                  <rect height="52" width="2" x="105" y="0" />
                  <rect height="52" width="4" x="109" y="0" />
                  <rect height="52" width="2" x="115" y="0" />
                  <rect height="52" width="6" x="119" y="0" />
                  <rect height="52" width="3" x="127" y="0" />
                  <rect height="52" width="2" x="132" y="0" />
                  <rect height="52" width="5" x="136" y="0" />
                  <rect height="52" width="3" x="143" y="0" />
                  <rect height="52" width="2" x="148" y="0" />
                  <rect height="52" width="6" x="152" y="0" />
                  <rect height="52" width="3" x="160" y="0" />
                  <rect height="52" width="2" x="165" y="0" />
                  <rect height="52" width="5" x="169" y="0" />
                  <rect height="52" width="2" x="176" y="0" />
                  <rect height="52" width="4" x="180" y="0" />
                  <rect height="52" width="3" x="186" y="0" />
                  <rect height="52" width="5" x="191" y="0" />
                  <rect height="52" width="2" x="198" y="0" />
                  <rect height="52" width="6" x="202" y="0" />
                  <rect height="52" width="2" x="210" y="0" />
                  <rect height="52" width="4" x="214" y="0" />
                  <rect height="52" width="3" x="220" y="0" />
                  <rect height="52" width="5" x="225" y="0" />
                  <rect height="52" width="3" x="232" y="0" />
                  <rect height="52" width="3" x="237" y="0" />
                </svg>
                <div className="text-xs tracking-[0.2em] font-extrabold text-[#090d16] mt-1 text-center font-mono">
                  {receiptData.barcodeString}
                </div>
              </div>

              {/* Physical QC Checklist */}
              <div className="relative pt-2 pb-1 space-y-1 text-[10px] text-[#334155] border-t border-[#cbd5e1]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#e2e8f0] flex items-center justify-center font-bold text-[#090d16] text-[9px]">
                    ✓
                  </span>
                  <span>QC: Batch Hologram Verified on Box</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#e2e8f0] flex items-center justify-center font-bold text-[#090d16] text-[9px]">
                    ✓
                  </span>
                  <span>QC: Minimum 12 Months Expiry Window</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-dotted border-[#cbd5e1] text-[9px]">
                  <span>Runner: {receiptData.runnerName}</span>
                  <span>{receiptData.dispatchInCharge}</span>
                </div>
                <div className="text-[9px] text-[#64748b] pt-0.5">
                  Settlement: {receiptData.settlementMethod} • Float Verified
                </div>
              </div>
            </div>

            {/* Perforated Jagged Paper Tear Cut Edge */}
            <div className="w-full h-3 flex overflow-hidden -mt-0.5">
              <div className="w-full flex">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-[#fcfcfc] rotate-45 -translate-y-1.5 shrink-0" />
                ))}
              </div>
            </div>
          </div>

          {/* Hardware Peripheral Status Bar */}
          <div className="bg-[#122131] border border-[#1f2f45] rounded-xl p-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1c2b3c] flex items-center justify-center text-emerald-400">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-white font-semibold">RP-80 Bluetooth</span>
                </div>
                <div className="text-[11px] text-slate-400">ESC/POS • Feed: Roll #02 (Full)</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast('Test Feed Cut Triggered (RP-80)')}
              className="px-2.5 py-1.5 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-white active:scale-95 transition text-xs font-semibold"
            >
              Test Cut
            </button>
          </div>
        </div>

        {/* Primary Print & Slip Dispatch Action Zone */}
        <div className="p-4 pt-2 pb-8 border-t border-[#172a3e] bg-[#051424] space-y-2 shrink-0">
          {/* Big Tactile Primary Print Trigger Button */}
          <button
            type="button"
            onClick={handlePrint}
            className={`w-full h-13 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] ${
              isPrinted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isPrinted ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Slip Printed Successfully (Tap to Reprint)</span>
              </>
            ) : (
              <>
                <Receipt className="w-5 h-5" />
                <span>Print Slip (ESC/POS)</span>
              </>
            )}
          </button>

          {/* Secondary Utility Split Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSmsRunner}
              className="h-10 rounded-lg bg-[#122131] border border-[#1f2f45] text-slate-200 hover:bg-[#1c2b3c] active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>SMS to Runner</span>
            </button>
            <button
              type="button"
              onClick={handleCopyPayload}
              className="h-10 rounded-lg bg-[#122131] border border-[#1f2f45] text-slate-200 hover:bg-[#1c2b3c] active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
            >
              <Copy className="w-4 h-4 text-indigo-400" />
              <span>Copy Payload</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Micro-interaction Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 transition-all duration-300 flex items-center justify-center">
          <div className="py-2.5 px-4 rounded-full bg-emerald-500 text-slate-950 shadow-2xl flex items-center gap-2 text-xs font-bold font-mono">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ── STEP 8: Print Success Confirmation Modal (Screen 8 Ground Truth) ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#010f1f]/85 backdrop-blur-md p-4 pb-6 sm:pb-4 transition-all">
          <div className="relative w-full max-w-sm bg-[#0d1c2d] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl text-center">
            {/* Pulsing Success Icon */}
            <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-25" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                <Receipt className="w-8 h-8" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
                FEED CUT TRIGGERED
              </span>
            </div>

            <h3 className="text-lg text-white font-extrabold mt-1">
              Thermal Slip Printed Successfully
            </h3>
            <p className="font-mono text-xs text-emerald-400 font-medium mt-0.5">
              Dispatched to RP-80 Bluetooth (203 DPI ESC/POS)
            </p>

            {/* Print Job Summary */}
            <div className="mt-3.5 p-3 bg-[#122131] rounded-xl border border-[#1f2f45] text-left space-y-2">
              <div className="flex justify-between items-center text-xs pb-1.5 border-b border-[#1c2b3c]">
                <span className="text-slate-400 font-medium">Job Status</span>
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Completed
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Slip Code</span>
                <span className="font-mono font-bold text-indigo-300">
                  {receiptData.barcodeString}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Target Printer</span>
                <span className="font-mono text-white font-semibold">RP-80 BT • 80mm Roll #02</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Float & Batch</span>
                <span className="font-semibold text-emerald-400">
                  {receiptData.totalUnits} PCS / {receiptData.totalSkus} SKUs (৳{receiptData.requiredCashFloat.toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Timestamp</span>
                <span className="font-mono text-slate-400 text-[11px]">{printDateTime}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
              >
                <CheckSquare className="w-5 h-5" />
                <span>Back to Shortlist</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowShareModal(true);
                }}
                className="w-full h-10 rounded-xl bg-[#122131] text-white hover:bg-[#1c2b3c] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#1f2f45] transition active:scale-[0.98]"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Share Slip with Runner (SMS / WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={handleReprint}
                className="w-full h-9 rounded-xl bg-transparent text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reprint Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Secondary Share Bottom-Sheet Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-[#010f1f]/80 backdrop-blur-sm transition-opacity">
          <div className="absolute inset-0" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full bg-[#122131] border-t border-[#1f2f45] rounded-t-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 rounded-full bg-[#273647] mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-[#1c2b3c]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base text-white font-bold leading-tight">Share Pick Slip</h3>
                  <p className="text-xs text-slate-400">
                    Dispatch to runner or supplier via channels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-[#1c2b3c] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slip Summary Banner */}
            <div className="mt-3 p-3 bg-[#051424] rounded-xl border border-[#1c2b3c] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-[#fcfcfc] text-[#090d16] flex items-center justify-center font-bold font-mono text-xs shrink-0">
                  PL
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-xs text-white font-bold truncate">
                    #{receiptData.slipNumber} • {receiptData.walkingRouteSummary[0] ?? receiptData.hubLocation}
                  </div>
                  <div className="text-[11px] text-emerald-400 truncate">
                    ৳{receiptData.requiredCashFloat.toLocaleString()} BDT ({receiptData.totalUnits} PCS / {receiptData.totalSkus} SKUs)
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                {receiptData.rigId}
              </span>
            </div>

            {/* Channel Options */}
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  showToast(`Opening WhatsApp with ${receiptData.runnerName}...`);
                }}
                className="w-full p-3 rounded-xl bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-[0.99] border border-emerald-500/30 flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Share on WhatsApp</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                        DIRECT RUNNER
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Send stand location &amp; item specs to {receiptData.runnerName}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  showToast('Forwarding to Operations Messenger Group...');
                }}
                className="w-full p-3 rounded-xl bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-[0.99] border border-indigo-500/30 flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Send via Messenger</div>
                    <div className="text-xs text-slate-400">
                      Forward to Paltan Operations Ops Group
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  showToast(`SMS Dispatched to Runner ${receiptData.runnerName}`);
                }}
                className="w-full p-3 rounded-xl bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-[0.99] border border-[#1f2f45] flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Send via SMS</div>
                    <div className="text-xs text-slate-400">
                      To Runner {receiptData.rigId}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(
                      `https://minsah-ops.internal/slips/${receiptData.slipNumber}`
                    );
                  }
                  showToast('Slip Link Copied to Clipboard');
                }}
                className="w-full p-3 rounded-xl bg-[#0d1c2d] hover:bg-[#172a3e] active:scale-[0.99] border border-[#1f2f45] flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1c2b3c] text-indigo-400 flex items-center justify-center shrink-0">
                    <Link className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Copy Pick Slip Payload Link</div>
                    <div className="text-xs text-slate-400">
                      Direct link for mobile thermal print queue
                    </div>
                  </div>
                </div>
                <Copy className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="mt-4 pt-2">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full h-11 rounded-xl bg-[#051424] text-slate-300 font-semibold text-xs active:bg-[#122131] transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
