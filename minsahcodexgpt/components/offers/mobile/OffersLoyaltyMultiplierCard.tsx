'use client';

import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';

interface OffersLoyaltyMultiplierCardProps {
  loyaltyPoints?: number;
}

export function OffersLoyaltyMultiplierCard({
  loyaltyPoints = 850,
}: OffersLoyaltyMultiplierCardProps) {
  return (
    <div className="bg-[#E8F0E5] rounded-[28px] p-5 shadow-sm flex flex-col gap-2.5 relative overflow-hidden border border-[#B5C4BB]/40">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#ccee9b] text-[#1c3a13] flex items-center justify-center">
            <Star className="w-4 h-4 fill-[#1c3a13]" />
          </div>
          <span className="text-xs font-bold text-[#062402]">
            Glow Rewards Club
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-[#062402] text-white text-[10px] font-bold tracking-wider">
          2X ACTIVATED
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-lg text-[#062402] font-bold">
          Double Points Weekend
        </h4>
        <p className="text-xs text-[#5A615D] leading-relaxed">
          Earn 2x Glow Points on all authenticated orders placed before midnight tonight. Redeem directly at checkout.
        </p>
      </div>

      <Link
        href="/account/loyalty"
        className="mt-1 self-start inline-flex items-center gap-1.5 text-[#062402] text-xs font-bold hover:underline"
      >
        <span>View My Balance ({loyaltyPoints} Pts Available)</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
