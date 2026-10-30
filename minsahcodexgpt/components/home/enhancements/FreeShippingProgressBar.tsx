"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Truck,
  Lock,
  ShieldCheck,
  Check,
  CheckCircle2,
  Plus,
  PartyPopper,
  Gift,
  Ticket,
  RotateCcw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useOfferEngine } from "@/contexts/OfferEngineContext";

export interface FreeShippingProgressBarProps {
  initialSubtotal?: number;
  freeShippingThreshold?: number;
  compact?: boolean;
  onCheckout?: (total: number) => void;
  onAddItem?: (product: { name: string; price: number }) => void;
}

export function FreeShippingProgressBar({
  initialSubtotal = 1250,
  freeShippingThreshold,
  compact = false,
  onCheckout,
  onAddItem,
}: FreeShippingProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  const { config } = useOfferEngine();
  const effectiveThreshold = freeShippingThreshold ?? config?.freeDelivery?.dhakaThreshold ?? 1500;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mode: "in-progress" vs "achieved"
  const [activeTab, setActiveTab] = useState<"in-progress" | "achieved">(
    initialSubtotal >= effectiveThreshold ? "achieved" : "in-progress"
  );

  const [currentSubtotal, setCurrentSubtotal] = useState(
    activeTab === "achieved" ? Math.max(1750, effectiveThreshold) : initialSubtotal
  );

  const isAchieved = activeTab === "achieved" || currentSubtotal >= effectiveThreshold;
  const progressPercent = Math.min(100, Math.round((currentSubtotal / effectiveThreshold) * 100));
  const remainingAmount = Math.max(0, effectiveThreshold - currentSubtotal);
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
    if (nextSubtotal >= effectiveThreshold) {
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
                className="w-9 h-9 rounded-full bg-white border border-[#E2DED8] flex items-center justify-center text-[#1C3A13] hover:bg-[#F2F6F0] transition-all active:scale-95 shadow-xs cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-[#181C1A] tracking-tight">
                    Shopping Bag
                  </h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1C3A13] border border-[#D4F6A2] font-bold">
                    {isAchieved ? "4 items" : "1 item"}
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
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "in-progress"
                    ? "bg-[#1C3A13] text-white shadow-xs"
                    : "text-[#5A615D] hover:text-[#181C1A]"
                }`}
              >
                ⏳ In-Progress
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch("achieved")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "achieved"
                    ? "bg-[#1C3A13] text-white shadow-xs"
                    : "text-[#5A615D] hover:text-[#181C1A]"
                }`}
              >
                🎉 Free Shipping
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
              <div className="absolute -top-12 right-10 w-44 h-44 bg-[#E0A9AF]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 left-10 w-44 h-44 bg-[#D4F6A2]/25 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FCE8EB] border border-[#E0A9AF] flex items-center justify-center text-[#C06C76] shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold text-[#9A3B46] bg-[#FCE8EB] px-2 py-0.5 rounded-md border border-[#F3C4CB]">
                        Free Delivery Threshold
                      </span>
                      <span className="text-[11px] text-[#5A615D]">
                        Dhaka &amp; Nationwide 64 Districts
                      </span>
                    </div>
                    <h2 className="text-[15px] sm:text-[17px] font-extrabold text-[#181C1A] mt-1 leading-snug">
                      Add just{" "}
                      <span className="text-[#1C3A13] font-black underline decoration-[#A4DB60] decoration-2 underline-offset-4">
                        ৳{remainingAmount}
                      </span>{" "}
                      more to unlock{" "}
                      <span className="text-[#1C3A13] font-black bg-[#EAF7D8] px-1.5 py-0.5 rounded inline-block">
                        100% Free Home Delivery!
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Current Cart Value Counter Badge */}
                <div className="text-right shrink-0 bg-white px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2DED8] shadow-xs">
                  <span className="text-[9px] sm:text-[10px] text-[#5A615D] block uppercase font-bold tracking-tight">
                    Current Cart
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#181C1A]">
                    ৳{currentSubtotal}{" "}
                    <span className="text-[10px] font-normal text-[#5A615D]">
                      / ৳{effectiveThreshold}
                    </span>
                  </span>
                </div>
              </div>

              {/* Dynamic Gradient Progress Bar with Milestones */}
              <div className="mt-4 relative pt-6 pb-2">
                <div className="w-full h-3 bg-[#E8F0E5] rounded-full overflow-hidden border border-[#D5E2D1] relative">
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
                    <Truck className="w-3 h-3" />
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#1C3A13] -mt-0.5" />
                </div>

                {/* Milestone Markers */}
                <div className="relative w-full flex justify-between items-center -mt-2 px-1">
                  <div className="flex flex-col items-center relative" style={{ marginLeft: "28%" }}>
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#C06C76] flex items-center justify-center z-10 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C06C76]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳500</span>
                    <span className="text-[9px] text-[#5A615D] font-medium hidden sm:inline">
                      Sample Gift ✓
                    </span>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#B88728] flex items-center justify-center z-10 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#B88728]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳1,000</span>
                    <span className="text-[9px] text-[#91620E] font-medium hidden sm:inline">
                      ৳50 Voucher ✓
                    </span>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-[#1C3A13] flex items-center justify-center z-10 shadow-xs">
                      <Lock className="w-2.5 h-2.5 text-[#1C3A13]" />
                    </div>
                    <span className="text-[10px] font-extrabold text-[#1C3A13] mt-1">
                      ৳{effectiveThreshold}
                    </span>
                    <span className="text-[9px] font-bold text-[#1C3A13]">Free Express</span>
                  </div>
                </div>
              </div>

              {/* Quick Summary Under Bar */}
              <div className="mt-4 pt-3 border-t border-[#E2DED8] flex items-center justify-between text-xs text-[#5A615D]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#B88728]" />
                  <span>
                    Standard shipping fee: <del className="text-[#7D8580]">৳70</del> (৳{remainingAmount} left for Free Delivery)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.href = "/shipping-policy";
                  }}
                  className="text-[11px] font-bold text-[#1C3A13] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  View Policy <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Booster Suggestions: Add to Meet Threshold */}
            <section className="px-4 sm:px-6 py-5 bg-white">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EAF7D8] flex items-center justify-center text-[#1C3A13]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#181C1A] tracking-wide">
                      Add to Unlock Free Shipping
                    </h3>
                    <p className="text-[11px] text-[#5A615D]">
                      Add small Korean skincare boosters to unlock free delivery instantly
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-[#1C3A13] font-bold bg-[#EAF7D8] px-2.5 py-0.5 rounded-full border border-[#D4F6A2] shrink-0">
                  ৳250+ Budget Match
                </span>
              </div>

              {/* Recommendation Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Booster 1: Laneige Mini */}
                <div className="bg-white border border-[#E2DED8] hover:border-[#1C3A13] hover:shadow-[0_10px_25px_-4px_rgba(28,58,19,0.08)] rounded-2xl p-3 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FCE8EB] border border-[#F3C4CB] rounded text-[9px] font-extrabold text-[#9A3B46]">
                    +৳250 EXACT
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
                        <span className="text-xs font-black text-[#1C3A13]">৳250</span>
                        <del className="text-[10px] text-[#7D8580]">৳320</del>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAdd({ name: "Lip Sleeping Mask Mini (3g)", price: 250 })
                    }
                    className="mt-2.5 w-full py-1.5 bg-[#F2F6F0] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] font-bold text-xs rounded-xl border border-[#D5E2D1] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1-Tap Add</span>
                  </button>
                </div>

                {/* Booster 2: Sheet Mask */}
                <div className="bg-white border border-[#E2DED8] hover:border-[#1C3A13] hover:shadow-[0_10px_25px_-4px_rgba(28,58,19,0.08)] rounded-2xl p-3 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FEF3C7] border border-[#FDE68A] rounded text-[9px] font-extrabold text-[#92400E]">
                    Bestseller
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
                        <span className="text-xs font-black text-[#1C3A13]">৳280</span>
                        <del className="text-[10px] text-[#7D8580]">৳350</del>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAdd({ name: "Anua Soothing Sheet Mask", price: 280 })
                    }
                    className="mt-2.5 w-full py-1.5 bg-[#F2F6F0] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] font-bold text-xs rounded-xl border border-[#D5E2D1] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1-Tap Add</span>
                  </button>
                </div>

                {/* Booster 3: Mini Sunscreen */}
                <div className="bg-white border border-[#E2DED8] hover:border-[#1C3A13] hover:shadow-[0_10px_25px_-4px_rgba(28,58,19,0.08)] rounded-2xl p-3 flex flex-col justify-between transition-all group relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#EAF7D8] border border-[#D4F6A2] rounded text-[9px] font-extrabold text-[#1C3A13]">
                    Travel Size
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
                        <span className="text-xs font-black text-[#1C3A13]">৳320</span>
                        <del className="text-[10px] text-[#7D8580]">৳400</del>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAdd({ name: "Soothing Sun Relief Mini 15ml", price: 320 })
                    }
                    className="mt-2.5 w-full py-1.5 bg-[#F2F6F0] hover:bg-[#1C3A13] hover:text-white text-[#1C3A13] font-bold text-xs rounded-xl border border-[#D5E2D1] flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>1-Tap Add</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Current Cart Item Summary Row */}
            <section className="px-4 sm:px-6 py-4 bg-[#FAF9F6] border-t border-[#E2DED8]">
              <h3 className="text-xs uppercase font-extrabold text-[#5A615D] tracking-wider mb-2.5">
                Current Cart Items
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
                    <p className="text-[11px] text-[#5A615D]">Qty: 1 • 100% Authentic Import</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#1C3A13]">৳1,250</span>
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

              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D4F6A2]/40 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center font-bold shadow-md shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-black text-[#1C3A13] bg-[#D4F6A2] px-2.5 py-0.5 rounded-full border border-[#BDE582]">
                        🎉 Free Shipping Unlocked!
                      </span>
                      <span className="text-[11px] text-[#1C3A13] font-bold">Congratulations!</span>
                    </div>
                    <h2 className="text-[16px] sm:text-[18px] font-black text-[#181C1A] mt-1 leading-tight">
                      100% Free Home Delivery has been activated for your order!
                    </h2>
                  </div>
                </div>

                {/* Total Cart Badge */}
                <div className="text-right shrink-0 bg-white px-3 py-1.5 sm:py-2 rounded-xl border border-[#D4F6A2] shadow-xs">
                  <span className="text-[9px] sm:text-[10px] text-[#1C3A13] block uppercase font-black">
                    Total Cart Value
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#181C1A]">
                    ৳{currentSubtotal}{" "}
                    <span className="text-[10px] sm:text-xs text-[#1C3A13] font-bold">
                      ✓ Qualified
                    </span>
                  </span>
                </div>
              </div>

              {/* 100% Completed Progress Bar */}
              <div className="mt-4 relative pt-5 pb-2">
                <div className="w-full h-3.5 bg-[#E8F0E5] rounded-full overflow-hidden border border-[#D5E2D1] relative">
                  <div className="h-full w-full rounded-full fs-shimmer-bar bg-gradient-to-r from-[#D79A8D] via-[#DDB063] to-[#1C3A13]" />
                </div>

                {/* Unlocked Finish Flag */}
                <div className="absolute top-1.5 right-0 flex flex-col items-center z-20 pointer-events-none">
                  <div className="px-2.5 py-0.5 rounded-md bg-[#1C3A13] text-[#D4F6A2] text-[10px] font-black shadow-lg flex items-center gap-1 border border-white">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>100% Achieved!</span>
                  </div>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-[#1C3A13] -mt-0.5" />
                </div>

                {/* Milestones All Checked */}
                <div className="relative w-full flex justify-between items-center -mt-2 px-1">
                  <div className="flex flex-col items-center relative" style={{ marginLeft: "28%" }}>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center z-10 shadow-xs">
                      <Check className="w-2.5 h-2.5 font-black" />
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳500</span>
                    <span className="text-[9px] text-[#1C3A13] font-bold hidden sm:inline">
                      Gift Added ✓
                    </span>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center z-10 shadow-xs">
                      <Check className="w-2.5 h-2.5 font-black" />
                    </div>
                    <span className="text-[10px] font-bold text-[#181C1A] mt-1">৳1,000</span>
                    <span className="text-[9px] text-[#1C3A13] font-bold hidden sm:inline">
                      Voucher Added ✓
                    </span>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="w-4 h-4 rounded-full bg-[#1C3A13] text-[#D4F6A2] flex items-center justify-center z-10 shadow-xs">
                      <Check className="w-3 h-3 font-black" />
                    </div>
                    <span className="text-[10px] font-black text-[#1C3A13] mt-1">
                      ৳{effectiveThreshold}
                    </span>
                    <span className="text-[9px] font-extrabold text-[#1C3A13]">
                      Free Shipping!
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings Success Banner */}
              <div className="mt-4 pt-3.5 border-t border-[#D5E2D1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#EAF7D8] flex items-center justify-center text-[#1C3A13]">
                    <Truck className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[#181C1A] font-semibold">
                    Delivery Fee: <del className="text-[#7D8580]">৳70</del>{" "}
                    <strong className="text-[#1C3A13] ml-1">৳0 (Saved ৳70!)</strong>
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#1C3A13] font-extrabold border border-[#D4F6A2] text-[11px]">
                  ⚡ Dhaka 24-48h Express
                </span>
              </div>
            </div>

            {/* Rewards Unlocked Tray */}
            <section className="px-4 sm:px-6 py-5 bg-white">
              <h3 className="text-xs uppercase font-extrabold text-[#1C3A13] tracking-wider mb-3 flex items-center gap-1.5">
                <PartyPopper className="w-4 h-4 text-[#1C3A13]" />
                <span>Unlocked Bonus Gifts with Your Order:</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#FAF9F6] border border-[#E2DED8] rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FCE8EB] text-[#9A3B46] border border-[#F3C4CB] flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181C1A]">
                      Mini Trial Ampoule (5ml)
                    </h4>
                    <p className="text-[11px] text-[#1C3A13] font-medium">
                      Complimentary gift added to order
                    </p>
                  </div>
                </div>

                <div className="bg-[#FAF9F6] border border-[#E2DED8] rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center justify-center shrink-0">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#181C1A]">
                      ৳50 Cashback Voucher (Glow VIP)
                    </h4>
                    <p className="text-[11px] text-[#92400E] font-medium">
                      Automatically applied on your next order
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Cart Preview in Achieved State */}
            <section className="px-4 sm:px-6 py-4 bg-[#FAF9F6] border-t border-[#E2DED8]">
              <h3 className="text-xs uppercase font-extrabold text-[#5A615D] tracking-wider mb-3">
                Items in Bag (2 items)
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
                      <p className="text-[11px] text-[#5A615D]">Qty: 1 • 100% Authentic Import</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#1C3A13]">৳1,250</span>
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
                      <p className="text-[11px] text-[#5A615D]">Qty: 1 • Centella &amp; Green Tea</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#1C3A13]">৳500</span>
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
              <span>Subtotal:</span>
              <span className="font-bold text-[#181C1A]">৳{currentSubtotal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Shipping (Standard Delivery):</span>
              {isAchieved ? (
                <span className="font-black text-[#1C3A13]">
                  ৳0 (Free!){" "}
                  <del className="text-[#7D8580] text-[10px] font-normal ml-1">৳70</del>
                </span>
              ) : (
                <span className="font-bold text-[#C06C76]">৳70</span>
              )}
            </div>
            <div className="border-t border-[#E2DED8] pt-2 flex justify-between items-baseline text-sm">
              <span className="font-bold text-[#181C1A]">Total Payable:</span>
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
            <Lock className="w-4 h-4" />
            <span>
              {isAchieved
                ? `Proceed with Free Shipping (৳${totalPayable}) →`
                : `Proceed to Checkout (৳${totalPayable}) →`}
            </span>
          </button>

          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 text-[11px] text-[#5A615D]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1C3A13]" /> 100% Authentic Product
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-[#1C3A13]" /> 7-Day Easy Returns
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
