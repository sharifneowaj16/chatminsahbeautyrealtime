'use client';

import React from 'react';
import { Zap, ShieldCheck, Shield, Truck, RefreshCw } from 'lucide-react';

export default function WarrantyClaimHeroBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#28531c] to-[#062402] text-white p-4 shadow-md relative overflow-hidden border border-[#D4F6A2]/20">
      <div className="absolute -right-4 -bottom-6 pointer-events-none opacity-10 select-none">
        <ShieldCheck className="w-28 h-28 text-[#D4F6A2]" />
      </div>

      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF7D8]/20 border border-[#4b6723]/30 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-[#D4F6A2]" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#D4F6A2]">
              1-Hr Express Review
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#D4F6A2] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Authenticity Guarantee</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-bold text-white tracking-tight leading-snug">
              Fast Claim &amp; Replacement
            </h2>
            <p className="text-xs text-[#e3e2e0]/90 leading-relaxed">
              100% Genuine batch promise. Instant courier swap right at your doorstep in Dhaka.
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#D4F6A2]/15 border border-[#D4F6A2]/30 flex items-center justify-center shrink-0 shadow-inner">
            <Shield className="w-6 h-6 text-[#D4F6A2]" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/20">
          <div className="flex items-center gap-1 text-[11px] text-[#D4F6A2]/90 font-medium">
            <Truck className="w-3.5 h-3.5" />
            <span>Doorstep Dhaka Pickup</span>
          </div>
          <span className="text-[10px] opacity-40">•</span>
          <div className="flex items-center gap-1 text-[11px] text-[#D4F6A2]/90 font-medium">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Zero-Hassle Instant Swap</span>
          </div>
        </div>
      </div>
    </div>
  );
}
