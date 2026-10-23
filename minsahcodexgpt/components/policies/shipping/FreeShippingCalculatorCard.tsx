"use client";

import React from "react";

interface FreeShippingCalculatorCardProps {
  currentCartBdt?: number;
  targetBdt?: number;
}

export function FreeShippingCalculatorCard({
  currentCartBdt = 2250,
  targetBdt = 2999,
}: FreeShippingCalculatorCardProps) {
  const diff = Math.max(targetBdt - currentCartBdt, 0);
  const percentage = Math.min(Math.round((currentCartBdt / targetBdt) * 100), 100);

  return (
    <section className="bg-[#F8FAF7] rounded-2xl p-4 border border-[#E2DED8]/60 shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#D4F6A2]/50 flex items-center justify-center text-[#062402]">
            <span className="material-symbols-outlined text-base">savings</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#062402] leading-tight">
              ফ্রি ডেলিভারি ক্যালকুলেটর
            </h3>
            <p className="text-[10px] text-[#5A615D]">Free Shipping Privilege Tracker</p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#4b6723] bg-[#ccee9b]/40 px-2.5 py-0.5 rounded-full">
          {percentage}% কমপ্লিট
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5 mt-2">
        <div className="w-full bg-[#F2F6F0] h-2.5 rounded-full overflow-hidden p-0.5 flex items-center border border-[#E2DED8]/50">
          <div
            className="bg-[#4b6723] h-full rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-medium text-[#5A615D]">
          <span>
            বর্তমান কার্ট: <strong className="text-[#062402] font-bold">৳{currentCartBdt.toLocaleString()}</strong>
          </span>
          <span>
            ফ্রি ডেলিভারি টার্গেট: <strong className="text-[#062402] font-bold">৳{targetBdt.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Callout Banner */}
      <div className="mt-3 bg-[#F2F6F0] px-3 py-2 rounded-xl flex items-center gap-2 border border-[#E2DED8]/40">
        <span className="material-symbols-outlined text-[#4b6723] text-lg">electric_bolt</span>
        <p className="text-[11px] text-[#062402] leading-tight">
          {diff > 0 ? (
            <>
              মাত্র <strong className="text-[#4b6723] font-bold">৳{diff.toLocaleString()}</strong> টাকার পণ্য যোগ করলেই{" "}
              <strong className="text-[#062402] font-bold">৬৪ জেলায় সম্পূর্ণ ফ্রি হোম ডেলিভারি!</strong>
            </>
          ) : (
            <strong className="text-[#4b6723] font-bold">অভিনন্দন! আপনি ফ্রি ডেলিভারি পেয়েছেন।</strong>
          )}
        </p>
      </div>
    </section>
  );
}
