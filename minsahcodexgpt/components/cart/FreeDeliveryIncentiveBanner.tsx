"use client";

import React from "react";
import { Sparkles, Truck } from "lucide-react";
import { formatPrice } from "@/utils/currency";

export interface FreeDeliveryIncentiveBannerProps {
  isUnlocked: boolean;
  remainingAmount: number;
  className?: string;
}

export function FreeDeliveryIncentiveBanner({
  isUnlocked,
  remainingAmount,
  className = "",
}: FreeDeliveryIncentiveBannerProps) {
  return (
    <div
      className={`rounded-lg bg-[#E5EAE1] px-4 py-3 text-center text-xs font-[450] text-[#1B361B] flex items-center justify-center gap-2 ${className}`.trim()}
    >
      <span className="text-[#1B361B]/40 select-none">【</span>
      {isUnlocked ? (
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#1B361B] shrink-0" />
          <span>FREE Delivery Unlocked on your order</span>
        </>
      ) : (
        <>
          <Truck className="h-3.5 w-3.5 text-[#1B361B] shrink-0" />
          <span>Add {formatPrice(remainingAmount)} more for FREE Delivery</span>
        </>
      )}
      <span className="text-[#1B361B]/40 select-none">】</span>
    </div>
  );
}

export default FreeDeliveryIncentiveBanner;
