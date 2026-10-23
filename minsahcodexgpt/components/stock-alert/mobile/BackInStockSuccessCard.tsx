'use client';

import { BellRing, Check, X } from 'lucide-react';

interface BackInStockSuccessCardProps {
  productTitle?: string;
  onDismiss?: () => void;
}

export function BackInStockSuccessCard({
  productTitle = 'লিপ মাস্ক',
  onDismiss,
}: BackInStockSuccessCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-[#F2F6F0] border border-[#ccee9b] text-[#1c3a13] flex items-center gap-3.5 relative overflow-hidden shadow-xs animate-in fade-in">
      <div className="w-11 h-11 rounded-full bg-[#ccee9b] border border-[#B5C4BB] flex items-center justify-center text-[#1c3a13] shrink-0 relative">
        <BellRing className="w-5 h-5 text-[#1c3a13]" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1c3a13] text-[#D4F6A2] flex items-center justify-center text-[10px] font-bold">
          <Check className="w-2.5 h-2.5" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-[#181C1A] flex items-center gap-1.5">
          <span>আপনাকে জানানো হবে!</span>
          <span className="text-[9px] bg-[#ccee9b] px-2 py-0.5 rounded text-[#1c3a13] font-bold uppercase">
            Alert Active
          </span>
        </div>
        <p className="text-[11px] text-[#5A615D] mt-0.5 leading-relaxed">
          {productTitle} স্টক ইন হওয়া মাত্রই আপনার নম্বরে সরাসরি মেসেজ পাঠানো হবে। ধন্যবাদ!
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[#5A615D] hover:text-[#181C1A] p-1 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
