'use client';

import React from 'react';
import { Zap, ShieldCheck, Shield, Truck, RefreshCw } from 'lucide-react';

export default function WarrantyClaimHeroBanner() {
  return (
    <div className="rounded-2xl bg-[#0f1011] border border-[#23252a] text-[#f7f8f8] p-4 sm:p-5 shadow-xl relative overflow-hidden">
      <div className="absolute -right-4 -bottom-6 pointer-events-none opacity-5 select-none">
        <ShieldCheck className="w-28 h-28 text-[#828fff]" />
      </div>

      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5e6ad2]/15 border border-[#5e6ad2]/30">
            <Zap className="w-3.5 h-3.5 text-[#828fff]" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#828fff]">
              1-Hr Express Review
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#27a644] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Authenticity Guarantee</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base sm:text-lg font-bold text-[#f7f8f8] tracking-tight leading-snug">
              Fast Claim &amp; Replacement
            </h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed">
              100% genuine batch promise. Instant courier swap right at your doorstep in Dhaka.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#828fff]" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#23252a]">
          <div className="flex items-center gap-1 text-xs text-[#828fff] font-medium">
            <Truck className="w-3.5 h-3.5" />
            <span>Doorstep Dhaka Pickup</span>
          </div>
          <span className="text-[10px] text-[#62666d]">•</span>
          <div className="flex items-center gap-1 text-xs text-[#828fff] font-medium">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Zero-Hassle Instant Swap</span>
          </div>
        </div>
      </div>
    </div>
  );
}