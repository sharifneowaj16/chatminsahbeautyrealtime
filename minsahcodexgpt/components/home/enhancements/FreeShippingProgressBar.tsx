"use client";

import React, { useState } from "react";

export interface FreeShippingProgressBarProps {
  initialSubtotal?: number;
  freeShippingThreshold?: number;
  compact?: boolean;
  onCheckout?: (total: number) => void;
  onAddItem?: (product: { name: string; price: number }) => void;
}

export function FreeShippingProgressBar({
  initialSubtotal = 1250,
  freeShippingThreshold = 1500,
  compact = false,
  onCheckout,
  onAddItem,
}: FreeShippingProgressBarProps) {
  // Mode: "in-progress" vs "achieved"
  const [activeTab, setActiveTab] = useState<"in-progress" | "achieved">(
    initialSubtotal >= freeShippingThreshold ? "achieved" : "in-progress"
  );

  const [currentSubtotal, setCurrentSubtotal] = useState(
    activeTab === "achieved" ? Math.max(1750, freeShippingThreshold) : initialSubtotal
  );

  const isAchieved = activeTab === "achieved" || currentSubtotal >= freeShippingThreshold;
  const progressPercent = Math.min(100, Math.round((currentSubtotal / freeShippingThreshold) * 100));
  const remainingAmount = Math.max(0, freeShippingThreshold - currentSubtotal);
  const shippingFee = isAchieved ? 0 : 70;
  const totalPayable = currentSubtotal + shippingFee;

  const handleTabSwitch = (state: "in-progress" | "achieved") => {
    setActiveTab(state);
    if (state === "in-progress") {
      setCurrentSubtotal(1250);
    } else {
      setCurrentSubtotal(1750);
    }
  };

  const handleQuickAdd = (product: { name: string; price: number }) => {
    const nextSubtotal = currentSubtotal + product.price;
    setCurrentSubtotal(nextSubtotal);
    if (nextSubtotal >= freeShippingThreshold) {
      setActiveTab("achieved");
    }
    if (onAddItem) {
      onAddItem(product);
    }
  };

  return (
    <div className="w-full flex justify-center font-sans text-[#181C1A]">
      <style>{`
        @keyframes fsShimmerMove {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .fs-shimmer-bar {
          position: relative;
          overflow: hidden;
        }
        .fs-shimmer-bar::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: fsShimmerMove 2.2s infinite;
        }
        @keyframes fsPulseScale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .fs-pulse-truck {
          animation: fsPulseScale 1.8s ease-in-out infinite;
        }
        @keyframes fsConfettiFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-38px) rotate(180deg); opacity: 0; }
        }
        .fs-confetti-piece {
          animation: fsConfettiFloat 1.8s ease-out infinite;
        }
      `}</style>

      {/* Main Container - max-w-[780px] Mobile-First */}
      <div
        className={`w-full ${
          compact
            ? "rounded-2xl border border-[#E2DED8] bg-white p-4 shadow-sm"
            : "max-w-[780px] bg-white rounded-[32px] sm:rounded-[36px] border border-[#E2DED8] shadow-[0_4px_20px_-2px_rgba(28,58,19,0.06)] overflow-hidden flex flex-col relative"
        }`}
      >
        {/* Header (Top Status Bar) - Only in Full View */}
        {!compact && (
          <header className="bg-[#FAF9F6]/95 border-b border-[#E2DED8] px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.history.back();
                }}
                className="w-9 h-9 rounded-full bg-white border border-[#E2DED8] flex items-center justify-center text-[#1C3A13] hover:bg-[#F2F6F0] transition-all active:scale-95 shadow-xs"
                aria-label="পিছনে যান"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-[#181C1A] tracking-tight">
                    শপিং ব্যাগ (My Cart)
                  </h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1C3A13] border border-[#D4F6A2] font-bold">
                    {isAchieved ? "৪টি আইটেম" : "১টি আইটেম"}
                  </span>
                </div>
                <p className="text-[11px] text-[#5A615D]">
                  100% Authentic Imports • Banani Central Hub
                </p>
              </div>
            </div>

            {/* State Switcher Pills */}
            <div className="flex items-center bg-[#F2F6F0] p-1 rounded-full border border-[#E2DED8]">
              <button
                type="button"
                onClick={() => handleTabSwitch("in-progress")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  activeTab === "in-progress"
                    ? "bg-[#1C3A13] text-white shadow-xs"
                    : "text-[#5A615D] hover:text-[#181C1A]"
                }`}
              >
                ⏳ ইন-প্রোগ্রেস
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("achieved")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeTab === "achieved"
                    ? "bg-[#1C3A13] text-white shadow-xs"
                    : "text-[#5A615D] hover:text-[#181C1A]"
                }`}
              >
                🎉 ফ্রি শিপিং
              </button>
            </div>
          </header>
        )}

        {/* ---------------------------------------------------- */}
        {/* COMPONENT SECTION 1: IN-PROGRESS STATE */}
        {/* ---------------------------------------------------- */}
        {!isAchieved && (
          <section className="transition-opacity duration-300">
            {/* Motivational Shipping Banner */}
            <div className="bg-gradient-to-b from-[#F7F9F5] to-white border-b border-[#E2DED8] px-4 sm:px-6 pt-5 pb-6 relative overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute -top-12 right-10 w-44 h-44 bg-[#E0A9AF]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 left-10 w-44 h-44 bg-[#D4F6A2]/25 rounded-full blur-3xl pointer-events-none" />

              {/* Alert Badge & Motivational Headline */}
              <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FCE8EB] border border-[#E0A9AF] flex items-center justify-center text-[#C06C76] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-[#9A3B46] bg-[#FCE8EB] px-2 py-0.5 rounded-md border border-[#F3C4CB]">
                        ফ্রি শিপিং থ্রেশহোল্ড
                      </span>
                      <span className="text-[11px] text-[#5A615D]">
                        ঢাকা ও দেশব্যাপী ৬৪ জেলায়
                      </span>
                    </div>
                    <h2 className="text-[15px] sm:text-[17px] font-extrabold text-[#181C1A] mt-1 leading-snug">
                      আর মাত্র{" "}
                      <span className="text-[#1C3A13] font-black underline decoration-[#A4DB60] decoration-2 underline-offset-4">
                        ৳{remainingAmount}
                      </span>{" "}
                      যোগ করলেই পাচ্ছেন{" "}
                      <span className="text-[#1C3A13] font-black bg-[#EAF7D8] px-1.5 py-0.5 rounded inline-block">
                        ১০০% ফ্রি হোম ডেলিভারি!
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Current Cart Value Counter Badge */}
                <div className="text-right shrink-0 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2DED8] shadow-xs">
                  <span className="text-[9px] sm:text-[10px] text-[#5A615D] block uppercase font-bold tracking-tight">
                    বর্তমান কার্ট
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#181C1A]">
                    ৳{currentSubtotal}{" "}
                    <span className="text-[10px] font-normal text-[#5A615D]">
                      / ৳{freeShippingThreshold}
                    </span>
                  </span>
                </div>
              </div>

              {/* Dynamic Gradient Progress Bar with Milestones */}
              <div className="mt-4 relative pt-6 pb-2">
                {/* Track Background */}
                <div className="w-full h-3 bg-[#E8F0E5] rounded-full overflow-hidden border border-[#D5E2D1] relative">
                  {/* Active Fill */}
                  <div
                    className="h-full rounded-full fs-shimmer-bar bg-gradient-to-r from-[#D79A8D] via-[#DDB063] to-[#1C3A13] transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Animated Moving Truck Indicator */}
                <div
                  className="absolute top-2.5 transition-all duration-700 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
                  style={{ left: `${progressPercent}%` }}
                >
                  <div className="px-2 py-0.5 rounded-md bg-[#1C3A13] text-[#D4F6A2] text-[10px] font-black shadow-md flex items-center gap-1 fs-pulse-truck border border-white">
                    <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#1C3A13] -mt-0.5" />
                </div>

                {/* Milestone Markers */}
                <div className="relative w-full flex justify-between items-center -mt-2 px-1">
                  {/* Milestone 1: ৳500 */}
                  <div className="flex flex-col items-center relative" style={{ marginLeft: "28%" }}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#C06C76] flex items-center justify-center z-10 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C06C76]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳৫০০</span>
                    <span className="text-[9px] text-[#5A615D] font-medium hidden sm:inline">
                      স্যাম্পল গিফট ✓
                    </span>
                  </div>

                  {/* Milestone 2: ৳1,000 */}
                  <div className="flex flex-col items-center relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#B88728] flex items-center justify-center z-10 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B88728]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳১,০০০</span>
                    <span className="text-[9px] text-[#91620E] font-medium hidden sm:inline">
                      ৫০৳ ভাউচার ✓
                    </span>
                  </div>

                  {/* Milestone 3: ৳1,500 (100% Free Shipping Target) */}
                  <div className="flex flex-col items-center relative">
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-[#1C3A13] flex items-center justify-center z-10 shadow-xs">
                      <span className="material-symbols-outlined text-[#1C3A13] text-[11px]">
                        lock
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#1C3A13] mt-1">
                      ৳{freeShippingThreshold}
                    </span>
                    <span className="text-[9px] font-bold text-[#1C3A13]">ফ্রি এক্সপ্রেস</span>
                  </div>
                </div>
              </div>

              {/* Quick Summary Under Bar */}
              <div className="mt-4 pt-3 border-t border-[#E2DED8] flex items-center justify-between text-xs text-[#5A615D]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#B88728] text-[16px]">
                    verified
                  </span>
                  <span>
                    নরমাল শিপিং চার্জ: <del className="text-[#7D8580]">৳৭০</del> (ফ্রি হতে আর ৳{remainingAmount} বাকি)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.href = "/shipping-policy";
                  }}
                  className="text-[11px] font-bold text-[#1C3A13] hover:underline flex items-center gap-0.5"
                >
                  পলিসি জানুন <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Booster Suggestions: Add to Meet Threshold */}
            <section className="px-4 sm:px-6 py-5 bg-white">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EAF7D8] flex items-center justify-center text-[#1C3A13]">
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#181C1A] tracking-wide">
                      ফ্রি শিপিং পেতে এগুলো যোগ করতে পারেন
                    </h3>
                    <p className="text-[11px] text-[#5A615D]">
                      Add small Korean skincare boosters to unlock free delivery instantly
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-[#1C3A13] font-bold bg-[#EAF7D8] px-2.5 py-0.5 rounded-full border border-[#D4F6A2] shrink-0">
                  ৳২৫০+ বাজেট ম্যাচ
                </span>
              </div>

              {/* Recommendation Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Booster 1: Laneige Mini */}
                <div className="bg-white border border-[#E2DED8] hover:border-[#1C3A13] hover:shadow-[0_10px_25px_-4px_rgba(28,58,19,0.08)] rounded-2xl p-3 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FCE8EB] border border-[#F3C4CB] rounded text-[9px] font-extrabold text-[#9A3B46]">
                    +৳২৫০ EXACT
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-[#FAF9F6] border border-[#E2DED8] overflow-hidden shrink-0 flex items-center justify-center p-1">
                      <img
                        alt="Laneige Mini"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=150&q=80"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#5A615D] uppercase font-semibold">
                        Laneige
                      </span>
                      <h4 className="text-xs font-bold text-[#181C1A] truncate">
                        Lip Sleeping Mask Mini (3g)
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-[#1C3A13]">৳২৫০</span>
                        <del className="text-[10px] text-[#7D8580]">৳৩২০</del>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAdd({ name: "Lip Sleeping Mask Mini (3g)", price: 250 })
                    }
                    className="mt-2.5 w-full py-1.5 bg-[#F2F6F0] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] font-bold text-xs rounded-xl border border-[#D5E2D1] flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>১-ট্যাপ যোগ করুন</span>
                  </button>
                </div>

                {/* Booster 2: Sheet Mask */}
                <div className="bg-white border border-[#E2DED8] hover:border-[#1C3A13] hover:shadow-[0_10px_25px_-4px_rgba(28,58,19,0.08)] rounded-2xl p-3 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[9px] font-extrabold text-[#92400E]">
                    বেস্টসেলার
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-[#FAF9F6] border border-[#E2DED8] overflow-hidden shrink-0 flex items-center justify-center p-1">
                      <img
                        alt="Anua Calming Sheet Mask"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        src="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=150&q=80"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#5A615D] uppercase font-semibold">
                        Anua Heartleaf
                      </span>
                      <h4 className="text-xs font-bold text-[#181C1A] truncate">
                        Soothing Calming Sheet Mask
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-[#1C3A13]">৳২৮০</span>
                        <del className="text-[10px] text-[#7D8580]">৳৩৫০</del>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAdd({ name: "Anua Soothing Sheet Mask", price: 280 })
                    }
                    className="mt-2.5 w-full py-1.5 bg-[#F2F6F0] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] font-bold text-xs rounded-xl border border-[#D5E2D1] flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>১-ট্যাপ যোগ করুন</span>
                  </button>
                </div>

                {/* Booster 3: Mini Sunscreen */}
                <div className="bg-white border border-[#E2DED8] hover:border-[#1C3A13] hover:shadow-[0_10px_25px_-4px_rgba(28,58,19,0.08)] rounded-2xl p-3 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#EAF7D8] border border-[#D4F6A2] rounded text-[9px] font-extrabold text-[#1C3A13]">
                    ট্রাভেল সাইজ
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-[#FAF9F6] border border-[#E2DED8] overflow-hidden shrink-0 flex items-center justify-center p-1">
                      <img
                        alt="Arisol Sunscreen Mini"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        src="https://images.unsplash.com/photo-1570554886111-e80fcca6a029?auto=format&fit=crop&w=150&q=80"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-[#5A615D] uppercase font-semibold">
                        Arisol Labs
                      </span>
                      <h4 className="text-xs font-bold text-[#181C1A] truncate">
                        Soothing Sun Relief Mini 15ml
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-black text-[#1C3A13]">৳৩২০</span>
                        <del className="text-[10px] text-[#7D8580]">৳৪০০</del>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAdd({ name: "Soothing Sun Relief Mini 15ml", price: 320 })
                    }
                    className="mt-2.5 w-full py-1.5 bg-[#F2F6F0] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] font-bold text-xs rounded-xl border border-[#D5E2D1] flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>১-ট্যাপ যোগ করুন</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Current Cart Item Summary Row */}
            <section className="px-4 sm:px-6 py-4 bg-[#FAF9F6] border-t border-[#E2DED8]">
              <h3 className="text-xs uppercase font-extrabold text-[#5A615D] tracking-wider mb-2.5">
                ব্যাগে থাকা পণ্যসমূহ (Current Cart Item)
              </h3>
              <div className="bg-white rounded-xl p-3 border border-[#E2DED8] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-[#FAF9F6] border border-[#E2DED8] p-1 shrink-0 flex items-center justify-center">
                    <img
                      alt="Elixir Serum"
                      className="w-full h-full object-contain"
                      src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=150&q=80"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#181C1A]">
                      Elixir Vital Glass Skin Serum (30ml)
                    </h5>
                    <p className="text-[11px] text-[#5A615D]">Qty: ১ • 100% Authentic Import</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#1C3A13]">৳১,২৫০</span>
              </div>
            </section>
          </section>
        )}

        {/* ---------------------------------------------------- */}
        {/* COMPONENT SECTION 2: ACHIEVED / CELEBRATION STATE */}
        {/* ---------------------------------------------------- */}
        {isAchieved && (
          <section className="transition-opacity duration-300">
            {/* Sticky Celebration Shipping Bar */}
            <div className="bg-gradient-to-b from-[#EAF7D8] via-[#F4F9EE] to-white border-b border-[#D4F6A2] px-4 sm:px-6 pt-5 pb-6 relative overflow-hidden">
              {/* Confetti Particles Animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="fs-confetti-piece absolute top-12 left-[15%] w-2 h-2 rounded-full bg-[#1C3A13]" />
                <div
                  className="fs-confetti-piece absolute top-8 left-[35%] w-2.5 h-1.5 rounded bg-[#B88728]"
                  style={{ animationDelay: "0.3s" }}
                />
                <div
                  className="fs-confetti-piece absolute top-14 left-[55%] w-2 h-2 rounded-full bg-[#C06C76]"
                  style={{ animationDelay: "0.7s" }}
                />
                <div
                  className="fs-confetti-piece absolute top-10 left-[75%] w-2.5 h-2 rounded bg-[#4B6723]"
                  style={{ animationDelay: "0.4s" }}
                />
                <div
                  className="fs-confetti-piece absolute top-16 left-[90%] w-1.5 h-1.5 rounded-full bg-[#B88728]"
                  style={{ animationDelay: "0.9s" }}
                />
              </div>

              {/* Ambient Celebration Glow */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D4F6A2]/40 rounded-full blur-3xl pointer-events-none" />

              {/* Header Celebration Banner */}
              <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center font-bold shadow-md shrink-0">
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-black text-[#1C3A13] bg-[#D4F6A2] px-2.5 py-0.5 rounded-full border border-[#BDE582]">
                        🎉 ফ্রি শিপিং অর্জিত! (Unlocked)
                      </span>
                      <span className="text-[11px] text-[#1C3A13] font-bold">অভিনন্দন!</span>
                    </div>
                    <h2 className="text-[16px] sm:text-[18px] font-black text-[#181C1A] mt-1 leading-tight">
                      আপনার অর্ডারে{" "}
                      <span className="text-[#1C3A13] underline decoration-[#1C3A13]/40 decoration-2">
                        সম্পূর্ণ ফ্রি হোম ডেলিভারি
                      </span>{" "}
                      সক্রিয় করা হয়েছে!
                    </h2>
                  </div>
                </div>

                {/* Total Cart Badge */}
                <div className="text-right shrink-0 bg-white px-3 py-1.5 sm:py-2 rounded-xl border border-[#D4F6A2] shadow-xs">
                  <span className="text-[9px] sm:text-[10px] text-[#1C3A13] block uppercase font-black">
                    মোট কার্ট ভ্যালু
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#181C1A]">
                    ৳{currentSubtotal}{" "}
                    <span className="text-[10px] sm:text-xs text-[#1C3A13] font-bold">
                      ✓ কোয়ালিফায়েড
                    </span>
                  </span>
                </div>
              </div>

              {/* 100% Completed Progress Bar */}
              <div className="mt-4 relative pt-5 pb-2">
                {/* Full Track */}
                <div className="w-full h-3.5 bg-[#E8F0E5] rounded-full overflow-hidden border border-[#D5E2D1] relative">
                  <div className="h-full w-full rounded-full fs-shimmer-bar bg-gradient-to-r from-[#D79A8D] via-[#DDB063] to-[#1C3A13]" />
                </div>

                {/* Unlocked Finish Flag */}
                <div className="absolute top-1.5 right-0 flex flex-col items-center z-20 pointer-events-none">
                  <div className="px-2.5 py-0.5 rounded-md bg-[#1C3A13] text-[#D4F6A2] text-[10px] font-black shadow-lg flex items-center gap-1 border border-white">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>১০০% অর্জিত!</span>
                  </div>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#1C3A13] -mt-0.5" />
                </div>

                {/* Milestones All Checked */}
                <div className="relative w-full flex justify-between items-center -mt-2 px-1">
                  <div className="flex flex-col items-center relative" style={{ marginLeft: "28%" }}>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center z-10 shadow-xs">
                      <span className="material-symbols-outlined text-[9px] font-black">done</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳৫০০</span>
                    <span className="text-[9px] text-[#1C3A13] font-bold hidden sm:inline">
                      গিফট যুক্ত ✓
                    </span>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center z-10 shadow-xs">
                      <span className="material-symbols-outlined text-[9px] font-black">done</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳১,০০০</span>
                    <span className="text-[9px] text-[#1C3A13] font-bold hidden sm:inline">
                      ভাউচার যুক্ত ✓
                    </span>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="w-4 h-4 rounded-full bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center z-10 shadow-xs">
                      <span className="material-symbols-outlined text-[11px] font-black">check</span>
                    </div>
                    <span className="text-[10px] font-black text-[#1C3A13] mt-1">
                      ৳{freeShippingThreshold}
                    </span>
                    <span className="text-[9px] font-extrabold text-[#1C3A13]">
                      ফ্রি শিপিং অর্জিত!
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings Success Banner */}
              <div className="mt-4 pt-3.5 border-t border-[#D5E2D1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#EAF7D8] flex items-center justify-center text-[#1C3A13]">
                    <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                  </span>
                  <span className="text-[#181C1A] font-semibold">
                    ডেলিভারি ফি: <del className="text-[#7D8580]">৳৭০</del>{" "}
                    <strong className="text-[#1C3A13] ml-1">৳০ (সাশ্রয় হয়েছে ৳৭০!)</strong>
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1C3A13] font-extrabold border border-[#D4F6A2] text-[11px]">
                  ⚡ ঢাকা ২৪-৪৮ ঘণ্টা এক্সপ্রেস
                </span>
              </div>
            </div>

            {/* Rewards Unlocked Tray */}
            <section className="px-4 sm:px-6 py-5 bg-white">
              <h3 className="text-xs uppercase font-extrabold text-[#1C3A13] tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">celebration</span>
                <span>আপনার অর্ডারে আনলক হওয়া অতিরিক্ত উপহারসমূহ:</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#FAF9F6] border border-[#E2DED8] rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FCE8EB] text-[#9A3B46] border border-[#F3C4CB] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      featured_seasonal_and_gifts
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181C1A]">
                      Mini Trial Ampoule (5ml)
                    </h4>
                    <p className="text-[11px] text-[#1C3A13] font-medium">
                      অর্ডারের সাথে সম্পূর্ণ ফ্রি গিফট যোগ হয়েছে
                    </p>
                  </div>
                </div>

                <div className="bg-[#FAF9F6] border border-[#E2DED8] rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      confirmation_number
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181C1A]">
                      ৫০৳ ক্যাশব্যাক কোড (Glow VIP)
                    </h4>
                    <p className="text-[11px] text-[#92400E] font-medium">
                      পরবর্তী পারচেজে স্বয়ংক্রিয়ভাবে প্রযোজ্য
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Cart Preview in Achieved State */}
            <section className="px-4 sm:px-6 py-4 bg-[#FAF9F6] border-t border-[#E2DED8]">
              <h3 className="text-xs uppercase font-extrabold text-[#5A615D] tracking-wider mb-3">
                ব্যাগে থাকা পণ্যসমূহ (২টি আইটেম)
              </h3>
              <div className="space-y-2.5">
                <div className="bg-white rounded-xl p-3 border border-[#E2DED8] shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#FAF9F6] border border-[#E2DED8] p-1 shrink-0 flex items-center justify-center">
                      <img
                        alt="Elixir Serum"
                        className="w-full h-full object-contain"
                        src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=150&q=80"
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#181C1A]">
                        Elixir Vital Glass Skin Serum (30ml)
                      </h5>
                      <p className="text-[11px] text-[#5A615D]">Qty: ১ • 100% Authentic Import</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#1C3A13]">৳১,২৫০</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-[#E2DED8] shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-[#FAF9F6] border border-[#E2DED8] p-1 shrink-0 flex items-center justify-center">
                      <img
                        alt="Sunscreen"
                        className="w-full h-full object-contain"
                        src="https://images.unsplash.com/photo-1570554886111-e80fcca6a029?auto=format&fit=crop&w=150&q=80"
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#181C1A]">
                        Arisol Soothing Sun Relief SPF50+ (50ml)
                      </h5>
                      <p className="text-[11px] text-[#5A615D]">Qty: ১ • Centella &amp; Green Tea</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#1C3A13]">৳৫০০</span>
                </div>
              </div>
            </section>
          </section>
        )}

        {/* ---------------------------------------------------- */}
        {/* COMPONENT SECTION 3: ORDER SUMMARY & CHECKOUT FOOTER */}
        {/* ---------------------------------------------------- */}
        <footer className="mt-auto bg-[#FAF9F6] border-t border-[#E2DED8] px-4 sm:px-6 py-4">
          <div className="space-y-1.5 mb-3.5 text-xs text-[#5A615D]">
            <div className="flex justify-between">
              <span>পণ্য সাবটোটাল (Subtotal):</span>
              <span className="font-bold text-[#181C1A]">৳{currentSubtotal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>শিপিং চার্জ (Standard Delivery):</span>
              {isAchieved ? (
                <span className="font-black text-[#1C3A13]">
                  ৳০ (ফ্রি!){" "}
                  <del className="text-[#7D8580] text-[10px] font-normal ml-1">৳৭০</del>
                </span>
              ) : (
                <span className="font-bold text-[#C06C76]">৳৭০</span>
              )}
            </div>
            <div className="border-t border-[#E2DED8] pt-2 flex justify-between items-baseline text-sm">
              <span className="font-bold text-[#181C1A]">মোট প্রদেয় (Total Payable):</span>
              <span className="text-lg font-black text-[#1C3A13]">৳{totalPayable}</span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            type="button"
            onClick={() => {
              if (onCheckout) {
                onCheckout(totalPayable);
              } else if (typeof window !== "undefined") {
                window.location.href = "/checkout";
              }
            }}
            className="w-full py-3.5 rounded-full bg-[#1C3A13] hover:bg-[#28531c] text-white font-black text-sm tracking-wide shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">lock</span>
            <span>
              {isAchieved
                ? `ফ্রি শিপিং সহ চেকআউটে এগিয়ে যান (৳${totalPayable}) →`
                : `নিরাপদ চেকআউটে এগিয়ে যান (৳${totalPayable}) →`}
            </span>
          </button>

          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 text-[11px] text-[#5A615D]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#1C3A13]">
                verified_user
              </span>{" "}
              ১০০% অরিজিনাল অথেনটিক প্রোডাক্ট
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#1C3A13]">
                replay
              </span>{" "}
              ৭ দিনের সহজ রিটার্ন
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
