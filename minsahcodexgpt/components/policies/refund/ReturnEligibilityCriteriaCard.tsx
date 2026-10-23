"use client";

import React from "react";

export function ReturnEligibilityCriteriaCard() {
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-baseline px-1">
        <h3 className="text-lg font-bold text-[#062402]">যোগ্যতার মানদণ্ড</h3>
        <span className="text-xs font-bold text-[#4b6723]">Eligibility Status</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Eligible Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2DED8] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EAF7D8] flex items-center justify-center shrink-0 text-[#4b6723]">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#062402]">অক্ষত ও সিলযুক্ত পণ্য</h4>
              <span className="bg-[#EAF7D8] text-[#1c3a13] font-bold text-[10px] px-2 py-0.5 rounded-full">
                রিটার্নযোগ্য
              </span>
            </div>
            <p className="text-xs text-[#43483f] leading-relaxed">
              কোরিয়ান অরিজিনাল হলোগ্রাম ও প্লাস্টিক সিল অক্ষত থাকলে এবং বক্স সম্পূর্ণ অবিকৃত অবস্থায় থাকলে পূর্ণ মূল্য ফেরতযোগ্য।
            </p>
            <p className="text-[11px] text-[#4b6723]">
              Unopened, unused with authentic manufacturer seal intact.
            </p>
          </div>
        </div>

        {/* Non-Eligible Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2DED8] shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center shrink-0 text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[24px]">cancel</span>
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#062402]">ব্যবহৃত বা সিল খোলা পণ্য</h4>
              <span className="bg-[#ffdad6] text-[#93000a] font-bold text-[10px] px-2 py-0.5 rounded-full">
                অফেরতযোগ্য
              </span>
            </div>
            <p className="text-xs text-[#43483f] leading-relaxed">
              ব্যক্তিগত হাইজিন ও স্কিন সেফটির স্বার্থে একবার সিল খোলা, ড্রপার বা পাম্প পুশ করা সিরাম/ক্রিম ফেরত নেওয়া হয় না।
            </p>
            <p className="text-[11px] text-[#ba1a1a]">
              Opened cosmetics cannot be restocked for hygiene &amp; skin health.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
