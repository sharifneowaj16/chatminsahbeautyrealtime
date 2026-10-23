"use client";

import React from "react";
import Link from "next/link";
import { TrustMerchantBanner } from "./TrustMerchantBanner";
import { PolicyAnchorNav } from "./PolicyAnchorNav";
import { AuthenticityPolicyCard } from "./AuthenticityPolicyCard";
import { ReturnPolicyCard } from "./ReturnPolicyCard";
import { ShippingPolicyTimelineCard } from "./ShippingPolicyTimelineCard";
import { DataPrivacyDeletionForm } from "./DataPrivacyDeletionForm";
import { PolicyFaqAccordion } from "./PolicyFaqAccordion";
import { OfficialEntityRegistryFootnote } from "./OfficialEntityRegistryFootnote";

export function CustomerCarePolicyView() {
  return (
    <div className="w-full min-h-screen bg-[#faf9f6] text-[#181C1A] antialiased">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#E2DED8]/40 px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Go Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#efeeeb] hover:bg-[#e9e8e5] transition-colors text-[#181C1A] active:scale-95"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </Link>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#4b6723]">
              Minsah Beauty Official
            </span>
            <h1 className="text-base font-bold leading-tight text-[#181C1A]">
              Customer Care &amp; Policies
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7D8] px-2.5 py-1 text-[11px] font-bold text-[#1c3a13] border border-[#4b6723]/20 shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-[#4b6723]">
              verified_user
            </span>
            Verified
          </span>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-lg mx-auto flex flex-col pb-20">
        <TrustMerchantBanner />
        <PolicyAnchorNav />
        <AuthenticityPolicyCard />
        <ReturnPolicyCard />
        <ShippingPolicyTimelineCard />
        <DataPrivacyDeletionForm />
        <PolicyFaqAccordion />
        <OfficialEntityRegistryFootnote />
      </main>
    </div>
  );
}
export default CustomerCarePolicyView;
