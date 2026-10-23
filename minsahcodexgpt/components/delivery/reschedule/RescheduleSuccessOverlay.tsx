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
      <div className="w-full max-w-md bg-white border border-[#E2DED8] rounded-[32px] p-6 text-center space-y-4 shadow-2xl">
        {/* Animated Badge */}
        <div className="w-18 h-18 mx-auto rounded-full bg-[#ccee9b] border-2 border-[#1c3a13] flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-[#1c3a13] animate-bounce" />
        </div>

        <div>
          <span className="text-[10px] font-bold text-[#1c3a13] bg-[#F2F6F0] px-3 py-1 rounded-full border border-[#B5C4BB] uppercase tracking-widest">
            Reschedule Confirmed
          </span>
          <h3 className="text-lg font-bold text-[#181C1A] mt-2">
            ডেলিভারি সময় সফলভাবে আপডেট হয়েছে!
          </h3>
          <p className="text-xs text-[#5A615D] mt-0.5">
            আপনার বনানী এক্সপ্রেস কুরিয়ার রাইডারকে নতুন শিডিউল পাঠানো হয়েছে।
          </p>
        </div>

        {/* Details Box */}
        <div className="bg-[#F2F6F0] border border-[#B5C4BB] rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center justify-between text-xs border-b border-[#E2DED8] pb-1.5">
            <span className="text-[#5A615D] font-medium">অর্ডার নম্বর:</span>
            <span className="font-bold text-[#181C1A]">{orderNumber}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-[#E2DED8] pb-1.5">
            <span className="text-[#5A615D] font-medium">নতুন তারিখ:</span>
            <span className="font-bold text-[#1c3a13]">{finalDate}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-[#E2DED8] pb-1.5">
            <span className="text-[#5A615D] font-medium">ডেলিভারি শিফট:</span>
            <span className="font-bold text-[#181C1A]">{finalTime}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#5A615D] font-medium">ডেলিভারি হাব:</span>
            <span className="font-bold text-[#28531c]">{hubName}</span>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#5A615D]">
          <MessageCircle className="w-3.5 h-3.5 text-[#28531c]" />
          <span>কনফার্মেশন এসএমএস ও হোয়াটসঅ্যাপে পাঠানো হয়েছে ({userPhone})</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onReturnToTracking}
            className="w-full bg-[#1c3a13] hover:bg-[#28531c] text-[#D4F6A2] font-bold text-xs py-3.5 px-6 rounded-full uppercase tracking-wider transition active:scale-95 shadow-md"
          >
            অর্ডার ট্র্যাকিং এ ফিরে যান (Back to Tracking)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs text-[#5A615D] hover:text-[#181C1A] py-1 transition font-semibold"
          >
            বন্ধ করুন (Dismiss)
          </button>
        </div>
      </div>
    </div>
  );
}
