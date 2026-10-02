// components/admin/shortlist/mobile/thermal/MobileThermalPrintToolbar.tsx
'use client';

import React from 'react';
import { Printer, Receipt, CheckCircle, Smartphone, Copy } from 'lucide-react';

export interface MobileThermalPrintToolbarProps {
  isPrinted: boolean;
  onPrint: () => void;
  onSmsRunner: () => void;
  onCopyPayload: () => void;
  onTestCut?: () => void;
}

export function MobileThermalPrintToolbar({
  isPrinted,
  onPrint,
  onSmsRunner,
  onCopyPayload,
  onTestCut,
}: MobileThermalPrintToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
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
        {onTestCut && (
          <button
            type="button"
            onClick={onTestCut}
            className="px-2.5 py-1.5 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-white active:scale-95 transition text-xs font-semibold"
          >
            Test Cut
          </button>
        )}
      </div>

      {/* Primary Print & Slip Dispatch Action Zone */}
      <div className="p-4 pt-2 pb-6 border-t border-[#172a3e] bg-[#051424] space-y-2 shrink-0 -mx-4 -mb-3">
        {/* Big Tactile Primary Print Trigger Button */}
        <button
          type="button"
          onClick={onPrint}
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
            onClick={onSmsRunner}
            className="h-10 rounded-lg bg-[#122131] border border-[#1f2f45] text-slate-200 hover:bg-[#1c2b3c] active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>SMS to Runner</span>
          </button>
          <button
            type="button"
            onClick={onCopyPayload}
            className="h-10 rounded-lg bg-[#122131] border border-[#1f2f45] text-slate-200 hover:bg-[#1c2b3c] active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          >
            <Copy className="w-4 h-4 text-indigo-400" />
            <span>Copy Payload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export default MobileThermalPrintToolbar;
