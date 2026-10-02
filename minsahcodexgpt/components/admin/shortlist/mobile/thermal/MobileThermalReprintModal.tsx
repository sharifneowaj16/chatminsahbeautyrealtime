// components/admin/shortlist/mobile/thermal/MobileThermalReprintModal.tsx
'use client';

import React from 'react';
import { ThermalReceiptPayload } from '@/app/admin/shortlist/types';
import {
  Receipt,
  CheckCircle,
  CheckSquare,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';

export interface MobileThermalReprintModalProps {
  isOpen: boolean;
  receiptData: ThermalReceiptPayload;
  printDateTime: string;
  onClose: () => void;
  onShare: () => void;
  onReprint: () => void;
}

export function MobileThermalReprintModal({
  isOpen,
  receiptData,
  printDateTime,
  onClose,
  onShare,
  onReprint,
}: MobileThermalReprintModalProps) {
  if (!isOpen) return null;

  return (
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
            <span className="text-slate-400 font-medium">Float &amp; Batch</span>
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
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98]"
          >
            <CheckSquare className="w-5 h-5" />
            <span>Back to Shortlist</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            className="w-full h-10 rounded-xl bg-[#122131] text-white hover:bg-[#1c2b3c] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#1f2f45] transition active:scale-[0.98]"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Share Slip with Runner (SMS / WhatsApp)</span>
          </button>

          <button
            type="button"
            onClick={onReprint}
            className="w-full h-9 rounded-xl bg-transparent text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reprint Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default MobileThermalReprintModal;
