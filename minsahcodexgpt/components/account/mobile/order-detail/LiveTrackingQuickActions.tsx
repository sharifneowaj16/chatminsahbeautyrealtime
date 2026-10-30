'use client';

import React from 'react';
import { QrCode, FileText, Headphones } from 'lucide-react';

interface LiveTrackingQuickActionsProps {
  onOpenHologramVerifier: () => void;
  onDownloadInvoice: () => void;
  onOpenConcierge: () => void;
  onOpenReschedule?: () => void;
}

export default function LiveTrackingQuickActions({
  onOpenHologramVerifier,
  onDownloadInvoice,
  onOpenConcierge,
  onOpenReschedule,
}: LiveTrackingQuickActionsProps) {
  return (
    <div className="px-4 mb-5">
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenHologramVerifier}
          className="p-3.5 rounded-[22px] bg-[#EAF7D8] text-[#1c3a13] hover:opacity-90 active:scale-95 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs border border-[#EAF7D8]"
        >
          <QrCode className="w-6 h-6 text-[#4b6723]" />
          <span className="text-xs font-bold">Verify Hologram</span>
          <span className="text-[10px] text-[#43483f]">Scan Authenticity QR</span>
        </button>

        <button
          type="button"
          onClick={onDownloadInvoice}
          className="p-3.5 rounded-[22px] bg-[#efeeeb] text-[#062402] hover:bg-[#e9e8e5] active:scale-95 transition-all flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs border border-[#E2DED8]/60"
        >
          <FileText className="w-6 h-6 text-[#4b6723]" />
          <span className="text-xs font-bold">Tax &amp; VAT Invoice</span>
          <span className="text-[10px] text-[#43483f]">Download PDF</span>
        </button>
      </div>

      {/* Reschedule Delivery Action Bar */}
      {onOpenReschedule && (
        <button
          type="button"
          onClick={onOpenReschedule}
          className="w-full mt-2.5 p-3 rounded-[22px] bg-[#F2F6F0] hover:bg-[#EAF7D8] text-[#1c3a13] border border-[#B5C4BB] flex items-center justify-between transition-all active:scale-[0.98] shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ccee9b] text-[#1c3a13] flex items-center justify-center font-bold">
              📅
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-[#181C1A] block">
                Reschedule Delivery (Date/Time)
              </span>
              <span className="text-[10px] text-[#43483f]">
                Choose your preferred date and time slot within the next 7 days
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#1c3a13] bg-white px-2.5 py-1 rounded-full border border-[#B5C4BB]">
            Change →
          </span>
        </button>
      )}

      {/* Need Help Concierge Card Pill */}
      <div className="mt-2.5 p-3.5 rounded-[24px] bg-[#F8FAF7] flex items-center justify-between border border-[#E2DED8]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#062402] text-white flex items-center justify-center">
            <Headphones className="w-4 h-4 text-[#c7edb5]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#062402] block">
              Need Dhaka Concierge Help?
            </span>
            <span className="text-[10px] text-[#43483f] font-medium">
              Available 10:00 AM – 10:00 PM BST
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenConcierge}
          className="px-3 py-1.5 rounded-full bg-[#062402] text-white text-[11px] font-bold active:scale-95 transition-all shadow-xs"
        >
          Chat Now
        </button>
      </div>
    </div>
  );
}
