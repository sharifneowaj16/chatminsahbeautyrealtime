'use client';

import React from 'react';
import { Gift, ArrowRight } from 'lucide-react';

interface WelcomeActionButtonsProps {
  onClaim: () => void;
  onDismiss: () => void;
  isClaimed?: boolean;
}

export default function WelcomeActionButtons({
  onClaim,
  onDismiss,
  isClaimed = false,
}: WelcomeActionButtonsProps) {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Primary CTA in Rich Deep Forest Evergreen */}
      <button
        type="button"
        onClick={onClaim}
        disabled={isClaimed}
        className="w-full py-3 sm:py-3.5 rounded-full bg-[#1c3a13] text-white font-bold text-[13.5px] sm:text-[14px] flex items-center justify-center gap-2 active:scale-98 hover:brightness-110 transition-all shadow-md relative overflow-hidden group cursor-pointer"
      >
        <Gift className="w-4 h-4 text-[#D4F6A2]" />
        <span className="text-[14px] sm:text-[15px] font-extrabold tracking-wide text-white">
          {isClaimed ? 'Coupon Applied!' : 'Claim 15% OFF'}
        </span>
        <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Success State Feedback */}
      {isClaimed && (
        <div className="mt-2.5 w-full bg-[#EAF7D8] border border-[#B5C4BB] text-[#1c3a13] p-2 sm:p-2.5 rounded-xl text-center text-xs animate-in fade-in duration-300">
          🎉 Coupon code <strong>WELCOME15</strong> applied! 15% discount has been added to your bag.
        </div>
      )}

      {/* 'No thanks' Dismiss Link */}
      <div className="mt-2.5 sm:mt-3.5 text-center">
        <button
          type="button"
          onClick={onDismiss}
          className="text-[10.5px] sm:text-[11px] text-[#5A615D] hover:text-[#181C1A] active:text-black underline underline-offset-4 tracking-wide transition-colors"
        >
          No thanks, I prefer paying full price
        </button>
      </div>
    </div>
  );
}
