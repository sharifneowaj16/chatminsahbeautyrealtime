'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AuthenticityTrustBanner() {
  return (
    <div className="p-3.5 rounded-2xl bg-[#F2F6F0] flex items-center gap-3 shadow-sm border border-[#E2DED8]/60">
      <div className="w-9 h-9 rounded-full bg-[#D4F6A2] flex items-center justify-center shrink-0">
        <ShieldCheck className="text-[#062402] w-5 h-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-bold text-[#1a1c1a]">
          100% Authentic Worldwide Imports
        </span>
        <span className="text-[12px] text-[#5A615D] leading-snug">
          Sourced directly from authorized brand laboratories. Serialized QR verification on every bottle.
        </span>
      </div>
    </div>
  );
}
