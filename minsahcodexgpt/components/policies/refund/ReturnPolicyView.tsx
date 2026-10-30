'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { RefundHeroPolicyBanner } from './RefundHeroPolicyBanner';
import { ReturnEligibilityCriteriaCard } from './ReturnEligibilityCriteriaCard';
import { ReturnProcessFlowTimeline } from './ReturnProcessFlowTimeline';
import { RefundChannelsTimelineCard } from './RefundChannelsTimelineCard';

export function ReturnPolicyView() {
  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-[#1a1c1a] antialiased">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md px-4 py-3 flex justify-between items-center max-w-lg mx-auto border-b border-[#E2DED8]/60">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            aria-label="Go Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#2D1F18] hover:bg-[#EFE6DE] active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-[#2D1F18] tracking-tight leading-tight">
              Return &amp; Refund Policy
            </h1>
            <p className="text-[10px] text-[#7A6E65] font-medium">Customer Guarantee &amp; Standards</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 bg-[#FAF6F2] text-[#2D1F18] px-2.5 py-1 rounded-full text-xs font-bold border border-[#EADFD5] shadow-xs">
          <CheckCircle2 size={14} className="text-emerald-700" />
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
