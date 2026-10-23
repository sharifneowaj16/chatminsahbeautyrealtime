"use client";

import React from "react";

export function ReturnProcessFlowTimeline() {
  return (
    <section className="bg-[#F8FAF7] p-4 rounded-2xl border border-[#E2DED8] space-y-4 shadow-xs">
      <div>
        <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider">
          সহজ ৪টি ধাপ
        </span>
        <h3 className="text-base font-bold text-[#062402]">
          রিটার্ন করার পদ্ধতি (Process Flow)
        </h3>
      </div>

      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E2DED8]">
        {/* Step 1 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#062402] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#F8FAF7]">
            ১
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#062402]">অনলাইনে রিকোয়েস্ট করুন</h4>
            <p className="text-xs text-[#43483f] mt-0.5 leading-relaxed">
              অর্ডার সেকশন থেকে &apos;Return Request&apos; বাটনে ক্লিক করুন অথবা আমাদের অফিসিয়াল WhatsApp Concierge-এ অর্ডার আইডি পাঠান।
            </p>
            <span className="text-[10px] text-[#4b6723] bg-[#EAF7D8] px-2 py-0.5 rounded-full inline-block mt-1 font-semibold">
              App / Web / WhatsApp
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#062402] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#F8FAF7]">
            ২
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#062402]">ভেরিফিকেশন ও অনুমোদন</h4>
            <p className="text-xs text-[#43483f] mt-0.5 leading-relaxed">
              আমাদের কিউরেশন টিম বক্সের বারকোড ও কিউআর ছবি দেখে ১২ ঘণ্টার মধ্যে রিকোয়েস্ট ভেরিফাই করবে।
            </p>
            <span className="text-[10px] text-[#43483f] font-medium">Hologram Batch Check (12 hrs SLA)</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#062402] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#F8FAF7]">
            ৩
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#062402]">ডোরস্টেপ ফ্রি পিকআপ</h4>
            <p className="text-xs text-[#43483f] mt-0.5 leading-relaxed">
              ঢাকার ভেতর নিজস্ব রাইডার এবং ঢাকার বাইরে রেডেক্স/পেপারফ্লাই কুরিয়ার আপনার বাসা থেকে প্রোডাক্ট সংগ্রহ করবে।
            </p>
            <span className="text-[10px] text-[#4b6723] font-semibold">Free Pickup inside Dhaka</span>
          </div>
        </div>

        {/* Step 4 */}
        <div className="relative">
          <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-[#062402] text-[#D4F6A2] flex items-center justify-center text-xs font-bold ring-4 ring-[#F8FAF7]">
            ৪
          </div>
          <div className="pl-2">
            <h4 className="text-xs font-bold text-[#062402]">রিফান্ড গ্রহণ</h4>
            <p className="text-xs text-[#43483f] mt-0.5 leading-relaxed">
              প্রোডাক্ট হাব-এ পৌঁছানোর পর দ্রুত আপনার bKash, Nagad বা মূল পেমেন্ট মেথডে সম্পূর্ণ টাকা রিফান্ড করা হবে।
            </p>
            <span className="text-[10px] text-[#4b6723] font-bold">Instant to 72 Hours</span>
          </div>
        </div>
      </div>
    </section>
  );
}
