'use client';

import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { AppliedCoupon } from './types';

interface ActiveAppliedCouponBannerProps {
  coupon: AppliedCoupon;
  onRemove: () => void;
}

export function ActiveAppliedCouponBanner({
  coupon,
  onRemove,
}: ActiveAppliedCouponBannerProps) {
  return (
    <div className="relative overflow-hidden p-4 rounded-[26px] bg-[#EAF7D8]/60 border-2 border-[#4b6723] shadow-sm flex flex-col gap-2 transition-all">
      {/* Subtle botanical glow accent */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#D4F6A2]/60 blur-xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#062402] text-[#ccee9b] flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5 fill-current text-[#062402]" stroke="#ccee9b" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-[#062402]">
                {coupon.code}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#062402] text-white text-[10px] font-bold uppercase tracking-wider">
                Active Code
              </span>
            </div>
            <p className="text-xs font-bold text-[#4b6723] mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Saved ৳{coupon.savingsAmount.toLocaleString('en-US')} ({coupon.discountText})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-bold text-[#ba1a1a] hover:text-[#93000a] hover:underline px-2 py-1 rounded-full active:scale-95 transition-all flex items-center gap-0.5"
        >
          <X className="w-3 h-3" />
          <span>Remove</span>
        </button>
      </div>

      <div className="pt-2 border-t border-[#4b6723]/20 flex items-center justify-between text-[11px] text-[#5A615D] font-medium">
        <span>{coupon.campaignTitle}</span>
        <span className="text-[#4b6723] font-semibold">T&amp;C Apply</span>
      </div>
    </div>
  );
}
