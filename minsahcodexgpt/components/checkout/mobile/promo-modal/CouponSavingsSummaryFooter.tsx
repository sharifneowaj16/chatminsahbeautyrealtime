'use client';

import { ShoppingBag, ArrowRight } from 'lucide-react';

interface CouponSavingsSummaryFooterProps {
  savingsAmount: number;
  payableAmount: number;
  hasAppliedCoupon: boolean;
  onContinue: () => void;
}

export function CouponSavingsSummaryFooter({
  savingsAmount,
  payableAmount,
  hasAppliedCoupon,
  onContinue,
}: CouponSavingsSummaryFooterProps) {
  return (
    <div className="px-4 py-3.5 bg-[#faf9f6]/95 backdrop-blur-md border-t border-[#E2DED8]/70 flex flex-col gap-2.5 shadow-[0_-8px_20px_rgba(6,36,2,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-[#5A615D] uppercase tracking-wider">
            সর্বমোট সাশ্রয় হয়েছে
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[20px] font-bold text-[#062402] tracking-tight">
              ৳{savingsAmount.toLocaleString('bn-BD')}
            </span>
            {hasAppliedCoupon && (
              <span className="text-xs text-[#4b6723] font-bold">(কুপন যুক্ত)</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-[#5A615D]">পরিশোধযোগ্য বিল</span>
          <div className="text-[16px] font-bold text-[#062402]">
            ৳{payableAmount.toLocaleString('bn-BD')}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3.5 rounded-full bg-[#062402] hover:bg-[#28531c] text-white font-bold text-sm active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 border border-[#4b6723]/30"
      >
        <ShoppingBag className="w-4 h-4 text-[#ccee9b]" />
        <span>এগিয়ে যান (Continue to Checkout)</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
