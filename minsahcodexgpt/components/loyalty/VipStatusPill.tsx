'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function VipStatusPill() {
  return (
    <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#EAF7D8] text-[#1c3a13] shadow-sm border border-[#4b6723]/10">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#4b6723]" />
        <span className="text-[12px] font-bold tracking-tight">
          Minsah VIP Member
        </span>
        <span className="text-[11px] opacity-75">
          • 100% Authentic Direct Import
        </span>
      </div>
      <span className="px-2 py-0.5 rounded-full bg-white text-[#4b6723] text-[10px] font-bold shadow-xs">
        Active
      </span>
    </div>
  );
}
