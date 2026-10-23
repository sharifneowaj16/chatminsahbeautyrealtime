"use client";

import React from "react";
import Link from "next/link";
import { TermsHeroBanner } from "./TermsHeroBanner";
import { TermsTableOfContents } from "./TermsTableOfContents";
import { TermsSectionList } from "./TermsSectionList";
import { TermsConsentFooter } from "./TermsConsentFooter";

export function TermsAndConditionsView() {
  return (
    <div className="w-full min-h-screen bg-[#FAF9F6] text-[#181C1A] antialiased">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#1c3a13] text-white px-4 py-3.5 shadow-md backdrop-blur-md bg-opacity-95 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            aria-label="Go back"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition border border-white/10"
          >
            <span className="material-symbols-outlined text-[20px] text-white">arrow_back</span>
          </Link>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#D4F6A2]">
                Legal &amp; Trust
              </span>
              <span className="inline-block w-1 h-1 rounded-full bg-[#D4F6A2]" />
              <span className="text-[10px] text-white/70">100% Authentic</span>
            </div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>শর্তাবলী</span>
              <span className="text-white/50 text-xs font-normal">/</span>
              <span className="text-sm font-semibold text-[#D4F6A2]">Terms &amp; Conditions</span>
            </h1>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D4F6A2]/20 text-[#D4F6A2] border border-[#D4F6A2]/30 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#D4F6A2]">verified</span>
          Verified
        </span>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto flex flex-col pb-6">
        <TermsHeroBanner />
        <TermsTableOfContents />
        <TermsSectionList />
        <TermsConsentFooter />
      </main>
    </div>
  );
}
export default TermsAndConditionsView;
