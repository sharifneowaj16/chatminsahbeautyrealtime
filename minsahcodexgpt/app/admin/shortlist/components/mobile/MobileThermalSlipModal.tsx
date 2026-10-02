// app/admin/shortlist/components/mobile/MobileThermalSlipModal.tsx
// Unified 80mm ESC/POS Thermal Slip — driven by shared ThermalReceiptPayload engine
// Pixel-parity for Stitch Screens 7 & 8 PLUS real window.print() via @media print
// Composed via Loop 9 Atomic Components

'use client';

import React, { useState, useMemo } from 'react';
import { ThermalReceiptPayload } from '../../types';
import { MobileThermalModalHeader } from '@/components/admin/shortlist/mobile/thermal/MobileThermalModalHeader';
import { MobileThermalSlipPreviewPaper } from '@/components/admin/shortlist/mobile/thermal/MobileThermalSlipPreviewPaper';
import { MobileThermalPrintToolbar } from '@/components/admin/shortlist/mobile/thermal/MobileThermalPrintToolbar';
import { MobileThermalReprintModal } from '@/components/admin/shortlist/mobile/thermal/MobileThermalReprintModal';
import { MobileThermalShareModal } from '@/components/admin/shortlist/mobile/thermal/MobileThermalShareModal';
import { Check } from 'lucide-react';

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
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
    setIsPrinted(true);
    showToast(`ESC/POS Command Dispatched (৳${receiptData.requiredCashFloat.toLocaleString()} BDT)`);
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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
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
        <MobileThermalModalHeader
          onClose={onClose}
          onShareClick={() => setShowShareModal(true)}
          dpiStatus="203 DPI • READY"
        />

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
          <MobileThermalSlipPreviewPaper receiptData={receiptData} />

          {/* Hardware Peripheral Status Bar & Buttons */}
          <MobileThermalPrintToolbar
            isPrinted={isPrinted}
            onPrint={handlePrint}
            onSmsRunner={handleSmsRunner}
            onCopyPayload={handleCopyPayload}
            onTestCut={() => showToast('Test Feed Cut Triggered (RP-80)')}
          />
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

      {/* STEP 8: Print Success Confirmation Modal */}
      <MobileThermalReprintModal
        isOpen={showSuccessModal}
        receiptData={receiptData}
        printDateTime={printDateTime}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
        onShare={() => {
          setShowSuccessModal(false);
          setShowShareModal(true);
        }}
        onReprint={handleReprint}
      />

      {/* Secondary Share Bottom-Sheet Modal */}
      <MobileThermalShareModal
        isOpen={showShareModal}
        receiptData={receiptData}
        onClose={() => setShowShareModal(false)}
        onToast={showToast}
      />
    </div>
  );
}
