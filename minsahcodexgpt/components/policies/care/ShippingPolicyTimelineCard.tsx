"use client";

import React from "react";

export function ShippingPolicyTimelineCard() {
  return (
    <section className="px-4 pt-8 scroll-mt-28" id="delivery">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#4b6723] text-[22px]">
          local_shipping
        </span>
        <span className="text-xs font-bold tracking-wider uppercase text-[#4b6723]">
          Dispatch &amp; Transit
        </span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-[#181C1A]">
        Transparent Shipping Timelines
      </h2>
      <p className="text-xs text-[#43483f] mt-1 leading-relaxed">
        Google Merchant &amp; TikTok Commerce certified shipping disclosures. 100% genuine sealed packaging.
      </p>

      <div className="mt-4 space-y-3">
        {/* Dhaka Metro Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#ccee9b]/70 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-md bg-[#EAF7D8] px-2 py-0.5 text-[10px] font-bold text-[#1c3a13] uppercase">
                Fastest Dispatch
              </span>
              <h3 className="text-sm font-bold text-[#181C1A] mt-1">
                Dhaka Metropolitan Area
              </h3>
              <p className="text-xs text-[#43483f] mt-0.5">
                Fast doorstep delivery via Steadfast &amp; Pathao express rider.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-[#4b6723]">&lt; 24 Hours</span>
              <p className="text-[10px] text-[#43483f]">Same-Day Dispatch</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#E2DED8]/40 flex items-center justify-between text-[11px] text-[#43483f]">
            <span>Delivery Fee: ৳70 (Free over ৳3,000)</span>
            <span className="text-[#4b6723] font-semibold">Priority Slot Available</span>
          </div>
        </div>

        {/* Nationwide Card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#E2DED8] bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-md bg-[#e9e8e5] px-2 py-0.5 text-[10px] font-bold text-[#181C1A] uppercase">
                Nationwide (64 Districts)
              </span>
              <h3 className="text-sm font-bold text-[#181C1A] mt-1">
                All Districts Outside Dhaka
              </h3>
              <p className="text-xs text-[#43483f] mt-0.5">
                Partnered exclusively with Steadfast &amp; Pathao Express.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold text-[#181C1A]">48 – 72 Hours</span>
              <p className="text-[10px] text-[#43483f]">Insured Transit</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#E2DED8]/40 flex items-center justify-between text-[11px] text-[#43483f]">
            <span>Standard Delivery Fee: ৳130</span>
            <span className="text-[#181C1A] font-semibold">Doorstep COD</span>
          </div>
        </div>
      </div>

      {/* Live SMS/WhatsApp Notification Banner */}
      <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-[#E2DED8]/70 bg-[#F8FAF7] p-3.5 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4b6723]/10 text-[#4b6723]">
          <span className="material-symbols-outlined text-[20px]">notifications_active</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-[#181C1A]">Live Checkpoint Telemetry</p>
          <p className="text-[11px] text-[#43483f] leading-tight">
            Instant SMS &amp; WhatsApp live tracking ping at dispatch, hub entry, and out-for-delivery.
          </p>
        </div>
      </div>
    </section>
  );
}
