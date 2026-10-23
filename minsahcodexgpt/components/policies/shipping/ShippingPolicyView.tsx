"use client";

import React from "react";
import Link from "next/link";
import { ShippingHeroCard } from "./ShippingHeroCard";
import { FreeShippingCalculatorCard } from "./FreeShippingCalculatorCard";
import { DeliveryZonesBentoList } from "./DeliveryZonesBentoList";
import { ColdChainPackagingInfo } from "./ColdChainPackagingInfo";
import { CourierPartnerLogosGrid } from "./CourierPartnerLogosGrid";

export function ShippingPolicyView() {
  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#1a1c1a] antialiased">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#E2DED8]/40 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Go Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#062402] hover:bg-[#efeeeb] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-[#062402] tracking-tight leading-tight">
              শিপিং ও ডেলিভারি নীতিমালা
            </h1>
            <span className="text-[10px] text-[#5A615D] uppercase tracking-wider -mt-0.5">
              Shipping &amp; Delivery Policy
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#F2F6F0] px-2.5 py-1 rounded-full border border-[#E2DED8]/50 shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-[#4b6723]">verified</span>
          <span className="text-[10px] font-bold text-[#1c3a13] whitespace-nowrap">100% Verified</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-20">
        <ShippingHeroCard />
        <FreeShippingCalculatorCard currentCartBdt={2250} targetBdt={2999} />
        <DeliveryZonesBentoList />
        <ColdChainPackagingInfo />
        <CourierPartnerLogosGrid />
      </main>
    </div>
  );
}
export default ShippingPolicyView;
