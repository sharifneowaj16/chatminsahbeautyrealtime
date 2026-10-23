'use client';

import React from 'react';
import { ShieldCheck, Headphones, MessageCircle } from 'lucide-react';

interface OrderHistoryGuaranteesProps {
  whatsappUrl?: string;
}

export default function OrderHistoryGuarantees({
  whatsappUrl = 'https://wa.me/8801700000000',
}: OrderHistoryGuaranteesProps) {
  return (
    <div className="flex flex-col gap-3 pb-8">
      {/* 100% Genuine Worldwide Authenticity */}
      <div className="p-4 rounded-3xl bg-[#EAF7D8]/40 flex items-start gap-3.5 shadow-xs border border-[#EAF7D8]">
        <div className="w-11 h-11 rounded-full bg-[#062402] text-[#e3e2e0] flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-[#c7edb5]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-[14px] text-[#062402] font-bold leading-tight">
              100% Genuine Worldwide Authenticity
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-[#062402] text-white text-[10px] uppercase font-bold tracking-wider">
              Guaranteed
            </span>
          </div>
          <p className="text-xs text-[#43483f] mt-1 leading-relaxed">
            Every parcel is sourced directly from verified international brand laboratories,
            authenticated at Banani Hub, and delivered across Bangladesh via Steadfast &amp; Pathao courier.
          </p>
        </div>
      </div>

      {/* Concierge Help Row */}
      <div className="p-4 rounded-3xl bg-white shadow-xs flex items-center justify-between gap-3 border border-[#E2DED8]/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#efeeeb] text-[#4b6723] flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[13px] text-[#062402] font-bold truncate">
              Dhaka Skincare Concierge
            </h4>
            <p className="text-[11px] text-[#43483f] truncate">
              Instant order queries via WhatsApp &amp; Call
            </p>
          </div>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-4 rounded-full bg-[#062402] text-white text-xs font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <MessageCircle className="w-4 h-4 text-[#c7edb5]" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
