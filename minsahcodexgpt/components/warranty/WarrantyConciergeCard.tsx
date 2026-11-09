'use client';

import React from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';

export default function WarrantyConciergeCard() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1011] border border-[#23252a] text-[#f7f8f8] flex items-center justify-between shadow-xl gap-3">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-[#f7f8f8] leading-tight">
            Need instant claim assistance?
          </span>
          <span className="text-xs text-[#8a8f98] mt-0.5 truncate font-mono">
            Banani Hub Concierge (9 AM – 11 PM)
          </span>
        </div>
      </div>
      <a
        href="https://wa.me/8801700000000"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-xl bg-[#27a644] hover:bg-[#2fb34a] text-white font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
      >
        <span>WhatsApp</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}