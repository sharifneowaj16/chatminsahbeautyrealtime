'use client';

import React from 'react';
import { Truck, Award, ShieldCheck, PackageCheck } from 'lucide-react';

export function ShippingHeroCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#1c3a13] text-[#FAF9F6] p-5 shadow-lg border border-[#28531c]/20">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#D4F6A2]/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#c7edb5]/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Top Category Pill */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[#D4F6A2] border border-[#D4F6A2]/20">
            <Truck size={14} />
            <span className="text-[11px] font-bold">Steadfast &amp; Pathao Express Delivery</span>
          </div>
          <Truck size={22} className="text-[#D4F6A2]" />
        </div>

        {/* Hero Headlines */}
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">
            Fast &amp; Secure Delivery Promise
          </h2>
          <p className="text-[11px] font-bold text-[#D4F6A2] tracking-wide uppercase mt-0.5">
            Pathao &amp; Steadfast Express Logistics
          </p>
        </div>

        <p className="text-xs text-[#FAF9F6]/85 leading-relaxed">
          Fresh batch authentic international formulations transported safely to your doorstep across all 64 districts in Bangladesh via Steadfast &amp; Pathao courier.
        </p>

        {/* Trust Badges Row */}
        <div className="pt-2 border-t border-white/15 grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center justify-center">
            <Award className="text-[#D4F6A2] mb-0.5" size={18} />
            <span className="text-[10px] font-bold text-white leading-tight">100% Authentic</span>
            <span className="text-[9px] text-[#FAF9F6]/70">Global Origin</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center justify-center">
            <ShieldCheck className="text-[#D4F6A2] mb-0.5" size={18} />
            <span className="text-[10px] font-bold text-white leading-tight">Authentic Shield</span>
            <span className="text-[9px] text-[#FAF9F6]/70">Tamper Evident</span>
          </div>
          <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center justify-center">
            <PackageCheck className="text-[#D4F6A2] mb-0.5" size={18} />
            <span className="text-[10px] font-bold text-white leading-tight">Doorstep Check</span>
            <span className="text-[9px] text-[#FAF9F6]/70">Open Before Pay</span>
          </div>
        </div>
      </div>
    </section>
  );
}
