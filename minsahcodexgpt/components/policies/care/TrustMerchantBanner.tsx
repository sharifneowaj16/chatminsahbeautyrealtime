"use client";

import React from "react";

export function TrustMerchantBanner() {
  return (
    <section className="p-4 pt-3">
      <div className="relative overflow-hidden rounded-2xl border border-[#ccee9b]/50 bg-gradient-to-br from-[#1c3a13] via-[#1c3a13] to-[#10240d] p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#D4F6A2]/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#D4F6A2]">
                <span className="material-symbols-outlined text-[13px]">g_translate</span>{" "}
                Google Merchant
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                Meta Ads
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                TikTok Shop
              </span>
            </div>
            <h2 className="text-base font-extrabold text-white leading-tight">
              Verified Merchant &amp; Consumer Standards
            </h2>
            <p className="mt-1 text-xs text-[#cadfc2] leading-relaxed">
              Direct Importer Authenticity • Zero Counterfeit Guarantee • TLS 1.3 256-bit Encrypted
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D4F6A2] text-[#1c3a13] shadow-sm">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
        </div>
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#e0efda]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#D4F6A2]">lock</span>
            Consumer Protection Act (BD No. 26) Compliant
          </span>
          <span className="font-semibold text-[#D4F6A2] flex items-center gap-0.5">
            Strict SLA <span className="material-symbols-outlined text-[13px]">chevron_right</span>
          </span>
        </div>
      </div>
    </section>
  );
}
