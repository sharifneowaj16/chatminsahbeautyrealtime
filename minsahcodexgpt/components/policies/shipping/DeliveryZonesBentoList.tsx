"use client";

import React from "react";

export function DeliveryZonesBentoList() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#062402] leading-tight">
            ডেলিভারি জোন ও সময়সূচি
          </h3>
          <p className="text-[11px] text-[#5A615D]">Delivery Zones &amp; Standard Rates</p>
        </div>
        <span className="text-xs text-[#4b6723] font-bold flex items-center gap-0.5">
          <span className="material-symbols-outlined text-sm">schedule</span> লাইভ টাইম
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Card 1: Inside Dhaka */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2DED8] shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4b6723] text-2xl">
                location_city
              </span>
              <div>
                <h4 className="text-sm font-bold text-[#062402]">ঢাকা মেট্রোপলিটন (Inside Dhaka)</h4>
                <p className="text-[11px] text-[#5A615D]">Home Delivery to all Dhaka zones</p>
              </div>
            </div>
            <span className="bg-[#D4F6A2] text-[#062402] font-bold text-xs px-2.5 py-1 rounded-full">
              ৳৭০ / ফ্রি*
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-[#F8FAF7] p-2 rounded-xl border border-[#E2DED8]/40">
              <div className="flex items-center gap-1 text-[#5A615D] text-[10px] font-medium">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">timelapse</span>{" "}
                সময়সীমা (Duration)
              </div>
              <div className="text-[#062402] font-bold mt-0.5 text-[11px]">২৪ - ৪৮ ঘণ্টা (১-২ দিন)</div>
            </div>
            <div className="bg-[#F8FAF7] p-2 rounded-xl border border-[#E2DED8]/40">
              <div className="flex items-center gap-1 text-[#5A615D] text-[10px] font-medium">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">bolt</span>{" "}
                এক্সপ্রেস ডেলিভারি
              </div>
              <div className="text-[#062402] font-bold mt-0.5 text-[11px]">৳১২০ (একই দিনে ডেলিভারি)</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#5A615D] bg-[#F2F6F0]/70 px-2.5 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-xs text-[#4b6723]">check_circle</span>
            <span>বনানী, গুলশান, ধানমন্ডি, উত্তরায় সেইম-ডে ও ক্যাশ অন ডেলিভারি (COD) উপলব্ধ।</span>
          </div>
        </div>

        {/* Card 2: Outside Dhaka */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2DED8] shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4b6723] text-2xl">map</span>
              <div>
                <h4 className="text-sm font-bold text-[#062402]">ঢাকার বাইরে সারা বাংলাদেশ (All 64 Districts)</h4>
                <p className="text-[11px] text-[#5A615D]">Doorstep transit via Steadfast &amp; Paperfly</p>
              </div>
            </div>
            <span className="bg-[#F2F6F0] text-[#062402] font-bold text-xs px-2.5 py-1 rounded-full border border-[#E2DED8]">
              ৳১৩০ / ফ্রি*
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="bg-[#F8FAF7] p-2 rounded-xl border border-[#E2DED8]/40">
              <div className="flex items-center gap-1 text-[#5A615D] text-[10px] font-medium">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">timelapse</span>{" "}
                সময়সীমা (Duration)
              </div>
              <div className="text-[#062402] font-bold mt-0.5 text-[11px]">৪৮ - ৭২ ঘণ্টা (২-৩ দিন)</div>
            </div>
            <div className="bg-[#F8FAF7] p-2 rounded-xl border border-[#E2DED8]/40">
              <div className="flex items-center gap-1 text-[#5A615D] text-[10px] font-medium">
                <span className="material-symbols-outlined text-[13px] text-[#4b6723]">shield</span>{" "}
                ট্রানজিট সিকিউরিটি
              </div>
              <div className="text-[#062402] font-bold mt-0.5 text-[11px]">সম্পূর্ণ বীমাকৃত পার্সেল</div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#5A615D] bg-[#F2F6F0]/70 px-2.5 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-xs text-[#4b6723]">check_circle</span>
            <span>চট্টগ্রাম, সিলেট, রাজশাহী, খুলনা সহ যেকোনো উপজেলা ও থানা সদরে হোম ডেলিভারি।</span>
          </div>
        </div>
      </div>
    </section>
  );
}
