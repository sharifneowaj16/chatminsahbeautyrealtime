'use client';

import { CheckCircle2, MessageCircle } from 'lucide-react';

interface RescheduleSuccessOverlayProps {
  orderNumber: string;
  finalDate: string;
  finalTime: string;
  hubName?: string;
  userPhone?: string;
  onReturnToTracking: () => void;
  onClose: () => void;
}

export function RescheduleSuccessOverlay({
  orderNumber = '#KR-88294',
  finalDate,
  finalTime,
  hubName = 'Banani Central Express Hub',
  userPhone = '+880 1712-***102',
  onReturnToTracking,
  onClose,
}: RescheduleSuccessOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 bg-[#0c140e]/95 backdrop-blur-md flex items-center justify-center p-5 animate-in fade-in">
      <div className="w-full max-w-md bg-white border border-[#EADFD5] rounded-[32px] p-6 text-center space-y-4 shadow-2xl">
        {/* Animated Badge */}
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-800 flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-9 h-9 text-emerald-800 animate-bounce" />
        </div>

        <div>
          <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">
            Reschedule Confirmed
          </span>
          <h3 className="text-lg font-bold text-[#2D1F18] mt-2">
            Delivery Schedule Updated Successfully!
          </h3>
          <p className="text-xs text-[#7A6E65] mt-0.5">
            Your updated delivery time has been dispatched to your courier rider.
          </p>
        </div>

        {/* Details Box */}
        <div className="bg-[#FAF6F2] border border-[#EADFD5] rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-[#EADFD5] pb-1.5">
            <span className="text-[#7A6E65] font-medium">Order Number:</span>
            <span className="font-bold text-[#2D1F18]">{orderNumber}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-[#EADFD5] pb-1.5">
            <span className="text-[#7A6E65] font-medium">New Date:</span>
            <span className="font-bold text-emerald-800">{finalDate}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-[#EADFD5] pb-1.5">
            <span className="text-[#7A6E65] font-medium">Time Slot:</span>
            <span className="font-bold text-[#2D1F18]">{finalTime}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#7A6E65] font-medium">Dispatch Hub:</span>
            <span className="font-bold text-emerald-800">{hubName}</span>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A6E65]">
          <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
          <span>Confirmation details sent via SMS &amp; WhatsApp ({userPhone})</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onReturnToTracking}
            className="w-full bg-[#1c3a13] hover:bg-[#28531c] text-white font-bold text-xs py-3.5 px-6 rounded-full uppercase tracking-wider transition active:scale-95 shadow-md cursor-pointer"
          >
            Back to Tracking
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs text-[#7A6E65] hover:text-[#2D1F18] py-1 transition font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
