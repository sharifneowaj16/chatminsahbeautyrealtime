'use client';

import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';

export default function WarrantyConciergeCard() {
  return (
    <div className="p-4 rounded-2xl bg-[#062402] text-white flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-[#28531c] text-[#D4F6A2] flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-bold text-white leading-tight">
            Need instant claim help?
          </span>
          <span className="text-[11px] text-[#D4F6A2] mt-0.5 truncate">
            Banani Hub Concierge (9 AM – 11 PM)
          </span>
        </div>
      </div>
      <a
        href="https://wa.me/8801700000000"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-transform shrink-0 hover:bg-[#d5f3d7]"
      >
        <span>WhatsApp</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
