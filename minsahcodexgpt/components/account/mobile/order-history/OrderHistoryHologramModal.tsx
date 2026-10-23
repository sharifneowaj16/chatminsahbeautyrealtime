'use client';

import React from 'react';
import { X, ShieldCheck, QrCode, Check } from 'lucide-react';

interface OrderHistoryHologramModalProps {
  isOpen: boolean;
  orderNumber: string;
  onClose: () => void;
}

export default function OrderHistoryHologramModal({
  isOpen,
  orderNumber,
  onClose,
}: OrderHistoryHologramModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] select-none flex flex-col justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#062402]/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-Up Sheet */}
      <div className="relative z-10 w-full max-h-[85vh] bg-white rounded-t-[32px] p-5 pb-8 overflow-y-auto flex flex-col gap-4 shadow-2xl no-scrollbar animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-1 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#c3c8bc]/60" />
        </div>

        <div className="flex items-center justify-between pb-1 border-b border-[#E2DED8]/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4b6723]" />
            <h3 className="text-[18px] text-[#062402] font-bold">
              Authenticity Certificate
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#43483f] hover:text-[#062402]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Card Content */}
        <div className="p-4 rounded-2xl bg-[#EAF7D8]/40 border border-[#EAF7D8] flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-[#062402] text-[#c7edb5] flex items-center justify-center shadow-md">
            <QrCode className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-[#062402]">
            100% Authentic Serialized Seal
          </h4>
          <p className="text-xs text-[#43483f] leading-relaxed">
            Order {orderNumber} is matched with an official authenticity certification and
            tamper-evident security barcode.
          </p>
        </div>

        {/* Spec Rows */}
        <div className="p-3.5 rounded-2xl bg-[#efeeeb] text-xs flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Authenticity Declaration:</span>
            <span className="font-bold text-[#062402]">MB-AUTH-2024-9428G</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Batch Seal:</span>
            <span className="font-bold text-[#4b6723]">MB-AN-9941 (Authentic)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Quality Inspection:</span>
            <span className="font-bold text-[#062402]">Passed &amp; Sealed at Banani Hub</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#43483f]">Dhaka Port Clearance:</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#4b6723]">
              <Check className="w-3.5 h-3.5" /> Cleared &amp; Inspected
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 mt-1 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-md"
        >
          Close Certificate
        </button>
      </div>
    </div>
  );
}
