"use client";

import React from "react";

export function ColdChainPackagingInfo() {
  return (
    <section className="bg-white rounded-2xl p-4 border border-[#E2DED8] shadow-xs space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#4b6723] text-xl">thermostat</span>
        <h3 className="text-sm font-bold text-[#062402]">
          থার্মাল ও সুরক্ষিত প্যাকেজিং প্রোটোকল (Protective Shield)
        </h3>
      </div>
      <p className="text-xs text-[#5A615D] leading-relaxed">
        আমাদের জেনুইন স্কিনকেয়ার সিরাম ও ক্রিমের সক্রিয় উপাদানগুলো (যেমন ভিটামিন সি, পেপটাইড, রেটিনল ও সেন্টেলা) আর্দ্রতা ও অতিরিক্ত তাপে যেন বিনষ্ট না হয়, সেজন্য আমরা বিশেষ ৩-লেয়ার থার্মো-ইন্সুলশন ব্যবহার করি:
      </p>

      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
        <div className="p-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/40">
          <span className="material-symbols-outlined text-[#4b6723] text-[20px] mb-1 block">
            layers
          </span>
          <p className="font-bold text-[11px] text-[#062402]">থার্মাল বাবল ফয়েল</p>
          <p className="text-[9px] text-[#5A615D] mt-0.5">Heat Block Foil</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/40">
          <span className="material-symbols-outlined text-[#4b6723] text-[20px] mb-1 block">
            ac_unit
          </span>
          <p className="font-bold text-[11px] text-[#062402]">কুলিং জেল প্যাক</p>
          <p className="text-[9px] text-[#5A615D] mt-0.5">18°C-22°C Cold Pack</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/40">
          <span className="material-symbols-outlined text-[#4b6723] text-[20px] mb-1 block">
            lock
          </span>
          <p className="font-bold text-[11px] text-[#062402]">টেম্পার-প্রুফ সিল</p>
          <p className="text-[9px] text-[#5A615D] mt-0.5">Hologram Locked</p>
        </div>
      </div>
    </section>
  );
}
