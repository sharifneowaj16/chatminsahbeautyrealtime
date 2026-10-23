"use client";

import React from "react";
import Link from "next/link";
import { RefundHeroPolicyBanner } from "./RefundHeroPolicyBanner";
import { ReturnEligibilityCriteriaCard } from "./ReturnEligibilityCriteriaCard";
import { ReturnProcessFlowTimeline } from "./ReturnProcessFlowTimeline";
import { RefundChannelsTimelineCard } from "./RefundChannelsTimelineCard";

export function ReturnPolicyView() {
  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#1a1c1a] antialiased">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md px-4 py-3 flex justify-between items-center max-w-lg mx-auto border-b border-[#E2DED8]/40">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            aria-label="Go Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#062402] hover:bg-[#efeeeb] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-base font-bold text-[#062402] tracking-tight leading-tight">
              রিটার্ন ও রিফান্ড নীতিমালা
            </h1>
            <p className="text-[10px] text-[#43483f] font-medium">Return &amp; Refund Policy</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 bg-[#E8F0E5] text-[#062402] px-2.5 py-1 rounded-full text-xs font-bold border border-[#4b6723]/20 shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-[#4b6723]">verified</span>
          <span>100% Genuine</span>
        </span>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-20">
        <RefundHeroPolicyBanner />
        <ReturnEligibilityCriteriaCard />
        <ReturnProcessFlowTimeline />
        <RefundChannelsTimelineCard />
      </main>
    </div>
  );
}
export default ReturnPolicyView;
