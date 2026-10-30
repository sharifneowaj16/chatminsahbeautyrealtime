'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function RefundHeroPolicyBanner() {
  return (
    <section className="bg-[#1c3a13] text-white rounded-2xl p-5 relative overflow-hidden shadow-sm">
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#D4F6A2]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2.5 py-0.5 rounded-full bg-[#D4F6A2] text-[#062402] font-bold text-xs">
          100% Authentic Guarantee
        </span>
        <span className="text-[#D4F6A2] font-bold text-xs flex items-center gap-1">
          <ShieldCheck size={14} /> K-Beauty Origin
        </span>
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Simple &amp; Reliable Return Policy</h2>
      <p className="text-xs text-white/80 mb-4">
        100% Hassle-Free Returns for Authentic Korean Skincare in Bangladesh.
      </p>

      {/* Bento Metric Badges */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20">
        <div className="bg-[#062402]/40 rounded-xl p-2 text-center backdrop-blur-xs">
          <span className="block text-[#D4F6A2] font-bold text-xs">7 Days Window</span>
          <span className="text-[10px] text-white/70">Return Window</span>
        </div>
        <div className="bg-[#062402]/40 rounded-xl p-2 text-center backdrop-blur-xs">
          <span className="block text-[#D4F6A2] font-bold text-xs">Free Pickup</span>
          <span className="text-[10px] text-white/70">Zero Fee Dhaka</span>
        </div>
        <div className="bg-[#062402]/40 rounded-xl p-2 text-center backdrop-blur-xs">
          <span className="block text-[#D4F6A2] font-bold text-xs">Fast Refund</span>
          <span className="text-[10px] text-white/70">Instant bKash</span>
        </div>
      </div>
    </section>
  );
}
