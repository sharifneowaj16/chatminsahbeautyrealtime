"use client";

import React from "react";
import Link from "next/link";

interface AddressRoutingHeaderProps {
  onBack?: () => void;
}

export function AddressRoutingHeader({ onBack }: AddressRoutingHeaderProps) {
  return (
    <section className="px-4 pt-3 pb-2 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Return to previous screen"
              className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#1a1c1a] hover:text-[#062402] active:scale-95 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          ) : (
            <Link
              href="/account/settings"
              aria-label="Return to previous screen"
              className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#1a1c1a] hover:text-[#062402] active:scale-95 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
          )}

          <div className="flex flex-col">
            <span className="text-lg font-bold text-[#062402] tracking-tight leading-tight">
              Add Delivery Address
            </span>
            <span className="text-[11px] text-[#43483f]">
              Step 2 of 2 • Dispatch Destination
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Delivery guidelines info"
          onClick={() =>
            alert(
              "Express Dispatch Guidelines:\n• Accurate building & road details prevent delivery delays.\n• Fast automated rider assignment across all 64 districts via Steadfast & Pathao."
            )
          }
          className="w-9 h-9 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center active:scale-95 transition-transform shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
        </button>
      </div>

      {/* Verified Express Routing Pill */}
      <div className="mt-1 p-2.5 rounded-xl bg-[#EAF7D8]/60 flex items-center justify-between border border-[#4b6723]/15">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#4b6723] text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#062402] truncate">
              Steadfast &amp; Pathao Express Guarantee
            </span>
            <span className="text-[11px] text-[#43483f] truncate">
              Inspected dispatch across 64 districts in Bangladesh
            </span>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white text-[#4b6723] shrink-0 shadow-xs border border-[#E2DED8]">
          24h Transit
        </span>
      </div>
    </section>
  );
}
