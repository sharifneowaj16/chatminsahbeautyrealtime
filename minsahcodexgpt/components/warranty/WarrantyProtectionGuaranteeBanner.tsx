'use client';

import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';

export default function WarrantyProtectionGuaranteeBanner() {
  return (
    <div className="rounded-2xl bg-[#E8F0E5] p-4 flex flex-col gap-2 relative overflow-hidden border border-[#B5C4BB]/60">
      <div className="flex items-center gap-2 text-[#062402]">
        <ShieldCheck className="w-5 h-5 text-[#4b6723]" />
        <span className="text-[14px] font-bold">
          Minsah 14-Day 100% Protection Guarantee
        </span>
      </div>
      <p className="text-[12px] text-[#43483f] leading-relaxed">
        Every luxury formulation delivered across Bangladesh is backed by authentic origin guarantees and zero-hassle replacement protection.
      </p>

      <div className="grid grid-cols-1 gap-2 pt-1 text-[12px]">
        <div className="flex items-center gap-2 text-[#1a1c1a]">
          <Check className="w-4 h-4 text-[#4b6723] shrink-0" />
          <span className="text-[11px]">
            Direct import verification via manufacturer authenticity batch registry
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#1a1c1a]">
          <Check className="w-4 h-4 text-[#4b6723] shrink-0" />
          <span className="text-[11px]">
            Complimentary doorstep reverse pickup via Steadfast &amp; Pathao
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#1a1c1a]">
          <Check className="w-4 h-4 text-[#4b6723] shrink-0" />
          <span className="text-[11px]">
            Instant replacement for damaged seals or cosmetic defects
          </span>
        </div>
      </div>
    </div>
  );
}
