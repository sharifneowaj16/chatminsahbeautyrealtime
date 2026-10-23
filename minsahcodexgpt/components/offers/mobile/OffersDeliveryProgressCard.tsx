'use client';

import { Bike } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface OffersDeliveryProgressCardProps {
  currentCartTotal?: number;
  freeShippingThreshold?: number;
}

export function OffersDeliveryProgressCard({
  currentCartTotal = 1950,
  freeShippingThreshold = 2500,
}: OffersDeliveryProgressCardProps) {
  const percentage = Math.min(100, Math.round((currentCartTotal / freeShippingThreshold) * 100));
  const remaining = Math.max(0, freeShippingThreshold - currentCartTotal);

  return (
    <div className="bg-[#F8FAF7] border border-[#E2DED8]/70 rounded-[24px] p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#062402] flex items-center justify-center text-white">
            <Bike className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[#062402]">
            Banani Express Dispatch
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#4b6723]">
          {percentage}% Completed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E8F0E5] h-2.5 rounded-full overflow-hidden relative mt-1">
        <div
          className="bg-[#062402] h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="text-xs text-[#5A615D] flex items-center justify-between mt-0.5">
        <span>
          {remaining > 0 ? (
            <>
              Add <strong className="text-[#062402] font-bold">{formatPrice(remaining)}</strong> more to unlock Free Express
            </>
          ) : (
            <span className="text-emerald-700 font-bold">🎉 Free Express Unlocked!</span>
          )}
        </span>
        <span className="text-[#062402] font-bold text-[11px]">
          {formatPrice(currentCartTotal)} / {formatPrice(freeShippingThreshold)}
        </span>
      </div>
    </div>
  );
}
