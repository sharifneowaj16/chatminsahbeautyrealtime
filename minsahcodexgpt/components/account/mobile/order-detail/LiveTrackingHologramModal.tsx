'use client';

import React from 'react';
import { X, ShieldCheck, QrCode } from 'lucide-react';

interface LiveTrackingHologramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanQR?: () => void;
}

export default function LiveTrackingHologramModal({
  isOpen,
  onClose,
  onScanQR,
}: LiveTrackingHologramModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] select-none flex flex-col justify-end"
    >
      <div
        className="fixed inset-0 bg-[#062402]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-h-[85vh] bg-white rounded-t-[32px] p-5 pb-8 flex flex-col gap-4 overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-1">
          <div className="w-12 h-1.5 rounded-full bg-[#c3c8bc]/60" />
        </div>

        <div className="flex items-center justify-between pb-1 border-b border-[#E2DED8]/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4b6723]" />
            <h3 className="text-lg font-bold text-[#062402]">Minsah Authenticity Verifier</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#43483f] hover:text-[#062402]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-[#EAF7D8]/40 border border-[#EAF7D8] flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-[#062402] text-white flex items-center justify-center shadow-md">
            <QrCode className="w-8 h-8 text-[#c7edb5]" />
          </div>
          <h4 className="text-sm font-bold text-[#062402]">Certified Authenticity Security Seal</h4>
          <p className="text-xs text-[#43483f] leading-relaxed">
            Every parcel from Minsah Beauty features an encrypted tamper-evident QR seal registered
            with authentic batch verification ledgers.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#efeeeb] text-xs flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Batch Certificate:</span>
            <span className="font-bold text-[#062402]">MB-AUTH-2024-88294</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Customs Clearance:</span>
            <span className="font-bold text-[#4b6723]">Pass / Authenticated</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Courier Dispatch Seal:</span>
            <span className="font-bold text-[#4b6723]">Intact (Seal #DAC-09)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onScanQR?.();
            onClose();
          }}
          className="w-full py-3.5 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-md"
        >
          Scan Live QR on Arrival
        </button>
      </div>
    </div>
  );
}
