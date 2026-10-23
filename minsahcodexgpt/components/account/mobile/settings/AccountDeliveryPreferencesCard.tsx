'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, BellRing } from 'lucide-react';
import type { AccountDefaultAddress } from './types';

interface AccountDeliveryPreferencesCardProps {
  address: AccountDefaultAddress;
  addressesCount?: number;
}

export default function AccountDeliveryPreferencesCard({
  address,
  addressesCount = 2,
}: AccountDeliveryPreferencesCardProps) {
  return (
    <section className="w-full bg-[#F8FAF7] rounded-3xl p-5 shadow-xs space-y-4 border border-[#E2DED8]/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#c7edb5] flex items-center justify-center text-[#062402]">
            <Truck className="w-4 h-4" />
          </div>
          <h3 className="text-sm text-[#062402] font-bold">Delivery Preferences</h3>
        </div>
        <Link
          href="/account/addresses"
          className="text-xs text-[#4b6723] font-bold hover:underline"
        >
          Manage ({addressesCount})
        </Link>
      </div>

      <div className="p-3.5 rounded-2xl bg-white space-y-2 border border-[#E2DED8]/50 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#062402] font-bold">
            {address.label}
          </span>
          <span className="bg-[#D4F6A2] text-[#1c3a13] text-[10px] px-2.5 py-0.5 rounded-full font-bold">
            {address.speedTier}
          </span>
        </div>
        <p className="text-xs text-[#062402] font-medium leading-relaxed">{address.fullAddress}</p>
        <div className="flex items-center gap-1.5 pt-1 text-[#5A615D]">
          <BellRing className="w-3.5 h-3.5 text-[#4b6723]" />
          <span className="text-[11px] italic">&quot;{address.deliveryInstruction}&quot;</span>
        </div>
      </div>
    </section>
  );
}
