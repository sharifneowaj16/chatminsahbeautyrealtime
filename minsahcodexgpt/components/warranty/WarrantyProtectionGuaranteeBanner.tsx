'use client';

import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';

export default function WarrantyProtectionGuaranteeBanner() {
  return (
    <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] p-5 shadow-xl flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-center gap-2.5 text-[#f7f8f8]">
        <div className="w-8 h-8 rounded-xl bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#828fff]" />
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight text-[#f7f8f8]">
            Minsah 14-Day 100% Protection Guarantee
          </span>
          <p className="text-[11px] text-[#8a8f98]">Official authentic origin and doorstep replacement assurance</p>
        </div>
      </div>

      <p className="text-xs text-[#8a8f98] leading-relaxed">
        Every luxury formulation delivered across Bangladesh is backed by direct authentic origin guarantees, batch verification, and zero-hassle replacement protection.
      </p>

      <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-[#c9cdd4]">
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#27a644] shrink-0" />
          <span>Direct import verification via manufacturer authenticity batch registry</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#27a644] shrink-0" />
          <span>Complimentary doorstep reverse pickup via Steadfast &amp; Pathao</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#27a644] shrink-0" />
          <span>Instant replacement for damaged seals or cosmetic defects</span>
        </div>
      </div>
    </div>
  );
}