"use client";

import React from "react";

export function RefundChannelsTimelineCard() {
  return (
    <section className="bg-white p-4 rounded-2xl border border-[#E2DED8] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#062402]">রিফান্ডের মাধ্যম ও সময়সীমা</h3>
        <span className="text-[10px] text-[#4b6723] font-bold uppercase tracking-wider bg-[#EAF7D8] px-2 py-0.5 rounded-full">
          Guaranteed SLA
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#F8FAF7] flex items-center justify-between border border-[#E2DED8]/40">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#ffd8e8] text-[#380f26] font-bold text-[10px] flex items-center justify-center">
              bK
            </span>
            <div>
              <p className="font-bold text-[#062402]">bKash / Nagad Wallet</p>
              <p className="text-[10px] text-[#43483f]">ডাইরেক্ট রিফান্ড ট্রান্সফার</p>
            </div>
          </div>
          <span className="font-bold text-[#4b6723]">১২ - ২৪ ঘণ্টা</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#F8FAF7] flex items-center justify-between border border-[#E2DED8]/40">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">credit_card</span>
            </span>
            <div>
              <p className="font-bold text-[#062402]">Visa / Mastercard</p>
              <p className="text-[10px] text-[#43483f]">ব্যাংক স্টেটমেন্ট অ্যাডজাস্টমেন্ট</p>
            </div>
          </div>
          <span className="font-bold text-[#181C1A]">৩ - ৫ কার্যদিবস</span>
        </div>

        <div className="p-2.5 rounded-xl bg-[#F8FAF7] flex items-center justify-between border border-[#E2DED8]/40">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#EAF7D8] text-[#1c3a13] font-bold text-[10px] flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            </span>
            <div>
              <p className="font-bold text-[#062402]">Minsah Store Credit</p>
              <p className="text-[10px] text-[#43483f]">ইনস্ট্যান্ট ভাউচার কোড</p>
            </div>
          </div>
          <span className="font-bold text-[#4b6723]">তাৎক্ষণিক (Instant)</span>
        </div>
      </div>
    </section>
  );
}
