'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ShippingHeroCard } from './ShippingHeroCard';
import { FreeShippingCalculatorCard } from './FreeShippingCalculatorCard';
import { DeliveryZonesBentoList } from './DeliveryZonesBentoList';
import { ColdChainPackagingInfo } from './ColdChainPackagingInfo';
import { CourierPartnerLogosGrid } from './CourierPartnerLogosGrid';

export function ShippingPolicyView() {
  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-[#1a1c1a] antialiased">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E2DED8]/60 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Go Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#2D1F18] hover:bg-[#EFE6DE] active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-[#2D1F18] tracking-tight leading-tight">
              Shipping &amp; Delivery Policy
            </h1>
            <span className="text-[10px] text-[#7A6E65] uppercase tracking-wider -mt-0.5">
              Minsah Official Delivery Standards
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#FAF6F2] px-2.5 py-1 rounded-full border border-[#EADFD5] shadow-xs">
          <CheckCircle2 size={14} className="text-emerald-700" />
          <span className="text-[10px] font-bold text-emerald-900 whitespace-nowrap">Verified Standards</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-20">
        <ShippingHeroCard />
        <FreeShippingCalculatorCard />
        <DeliveryZonesBentoList />
        <ColdChainPackagingInfo />
        <CourierPartnerLogosGrid />
      </main>
    </div>
  );
}
export default ShippingPolicyView;
