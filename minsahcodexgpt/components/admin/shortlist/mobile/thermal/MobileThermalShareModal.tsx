// components/admin/shortlist/mobile/thermal/MobileThermalShareModal.tsx
'use client';

import React from 'react';
import { ThermalReceiptPayload } from '@/app/admin/shortlist/types';
import {
  Share2,
  X,
  MessageSquare,
  Smartphone,
  ChevronRight,
  Link,
  Copy,
} from 'lucide-react';

export interface MobileThermalShareModalProps {
  isOpen: boolean;
  receiptData: ThermalReceiptPayload;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function MobileThermalShareModal({
  isOpen,
  receiptData,
  onClose,
  onToast,
}: MobileThermalShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-[#010f1f]/80 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />
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
            onClick={onClose}
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
              onClose();
              onToast(`Opening WhatsApp with ${receiptData.runnerName}...`);
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
              onClose();
              onToast('Forwarding to Operations Messenger Group...');
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
              onClose();
              onToast(`SMS Dispatched to Runner ${receiptData.runnerName}`);
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
              onClose();
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(
                  `https://minsah-ops.internal/slips/${receiptData.slipNumber}`
                );
              }
              onToast('Slip Link Copied to Clipboard');
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
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-[#051424] text-slate-300 font-semibold text-xs active:bg-[#122131] transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
export default MobileThermalShareModal;
