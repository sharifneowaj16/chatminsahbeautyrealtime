'use client';

import React from 'react';
import { CreditCard, Wallet, Smartphone } from 'lucide-react';

export function RefundChannelsTimelineCard() {
  return (
    <section className="bg-white p-4 rounded-2xl border border-[#EADFD5] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#2D1F18]">Refund Channels &amp; Timelines</h3>
        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded-full">
          Guaranteed SLA
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#FAF6F2] flex items-center justify-between border border-[#EADFD5]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-800 font-bold text-[10px] flex items-center justify-center">
              <Smartphone size={16} />
            </span>
            <div>
              <p className="font-bold text-[#2D1F18]">bKash / Nagad Wallet</p>
              <p className="text-[10px] text-[#7A6E65]">Direct mobile wallet transfer</p>
            </div>
          </div>
          <span className="font-bold text-emerald-800">12 - 24 Hours</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#FAF6F2] flex items-center justify-between border border-[#EADFD5]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">
              <CreditCard size={16} />
            </span>
            <div>
              <p className="font-bold text-[#2D1F18]">Visa / Mastercard</p>
              <p className="text-[10px] text-[#7A6E65]">Bank statement adjustment</p>
            </div>
          </div>
          <span className="font-bold text-[#2D1F18]">3 - 5 Business Days</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#FAF6F2] flex items-center justify-between border border-[#EADFD5]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
              <Wallet size={16} />
            </span>
            <div>
              <p className="font-bold text-[#2D1F18]">Minsah Store Credit</p>
              <p className="text-[10px] text-[#7A6E65]">Instant voucher credit</p>
            </div>
          </div>
          <span className="font-bold text-emerald-800">Instant</span>
        </div>
      </div>
    </section>
  );
}
