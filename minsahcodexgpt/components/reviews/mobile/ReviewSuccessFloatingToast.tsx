'use client';

import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ReviewSuccessFloatingToastProps {
  orderNumber?: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function ReviewSuccessFloatingToast({
  orderNumber = 'MB-88294',
  onDismiss,
  durationMs = 6000,
}: ReviewSuccessFloatingToastProps) {
  const [progressWidth, setProgressWidth] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgressWidth(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs, onDismiss]);

  return (
    <div className="fixed top-20 inset-x-4 z-50 transition-all duration-500 transform translate-y-0 opacity-100 ease-out max-w-md mx-auto">
      <div className="rounded-2xl bg-white shadow-2xl p-4 flex flex-col gap-2 relative overflow-hidden border border-[#E2DED8]">
        {/* Glow Accent Orb */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#ccee9b] rounded-full blur-2xl pointer-events-none opacity-60" />

        <div className="flex items-start gap-3 z-10">
          <div className="relative w-10 h-10 rounded-full bg-[#EAF7D8] text-[#516d29] flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-[#4b6723]" />
            <span className="absolute inset-0 rounded-full bg-[#4b6723]/20 animate-ping" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#4b6723] uppercase font-bold tracking-wider">
                সফলভাবে প্রাপ্ত হয়েছে!
              </span>
              <span className="text-[10px] text-[#43483f] font-mono font-semibold">
                Order #{orderNumber}
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#062402] leading-tight mt-0.5">
              রিভিউ সফলভাবে জমা দেওয়া হয়েছে!
            </h3>
            <p className="text-xs text-[#43483f] mt-0.5 leading-snug">
              আপনার মূল্যবান মতামত ভেরিফাই করা হচ্ছে এবং ৩০ মিনিটের মধ্যে লাইভ হবে।
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="w-7 h-7 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#43483f] hover:text-[#062402] transition-all shrink-0 active:scale-95"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1 bg-[#F2F6F0] rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-[#4b6723] transition-all duration-75 ease-linear"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}
