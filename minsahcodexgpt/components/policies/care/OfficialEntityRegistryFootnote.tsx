"use client";

import React from "react";

export function OfficialEntityRegistryFootnote() {
  const handleConciergeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("minsah:open-concierge-mobile"));
  };

  return (
    <section className="px-4 pt-8 pb-8">
      <div className="rounded-2xl border border-[#E2DED8] bg-[#e9e8e5]/60 p-4 text-[#181C1A]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#4b6723]">
            Official Entity Registry
          </span>
          <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-[#43483f] border border-[#E2DED8]">
            BIN: 004819284-0101
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723] shrink-0 mt-0.5">
              apartment
            </span>
            <div>
              <p className="font-bold text-[#181C1A]">Minsah Beauty Limited</p>
              <p className="text-[11px] text-[#43483f]">
                Incorporated under Registrar of Joint Stock Companies (RJSC)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723] shrink-0 mt-0.5">
              location_on
            </span>
            <p className="text-[11px] text-[#43483f]">
              Central Logistics Hub, Road 7, Block E, Banani / Gulshan-2, Dhaka 1213, Bangladesh
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723] shrink-0 mt-0.5">
              verified
            </span>
            <p className="text-[11px] text-[#43483f]">
              Trade License No: TRAD/DNCC/029410/2023 • BSTI &amp; DGDA Import Permitted
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E2DED8]/60 grid grid-cols-2 gap-2 text-xs">
          <a
            href="tel:+8801700646724"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white p-2 font-bold text-[#181C1A] border border-[#E2DED8]/70 shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-[#4b6723]">call</span>
            +880 1700-MINSAH
          </a>
          <a
            href="mailto:care@minsahbeauty.com"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white p-2 font-bold text-[#181C1A] border border-[#E2DED8]/70 shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-[#4b6723]">mail</span>
            care@minsahbeauty.com
          </a>
        </div>

        {/* Direct WhatsApp Concierge CTA */}
        <button
          type="button"
          onClick={handleConciergeClick}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 p-2.5 text-xs font-bold text-[#145a27] hover:bg-[#25D366]/25 transition-colors active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px] text-[#25D366]">chat</span>
          Open WhatsApp Live Concierge (9 AM – 11 PM)
        </button>
      </div>
    </section>
  );
}
