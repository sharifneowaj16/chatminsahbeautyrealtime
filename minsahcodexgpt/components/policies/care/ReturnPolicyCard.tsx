"use client";

import React from "react";
import Link from "next/link";

export function ReturnPolicyCard() {
  return (
    <section className="px-4 pt-8 scroll-mt-28" id="returns">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#4b6723] text-[22px]">
          published_with_changes
        </span>
        <span className="text-xs font-bold tracking-wider uppercase text-[#4b6723]">
          Google &amp; TikTok Standard
        </span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-[#181C1A]">
        Transparent 14-Day Return &amp; Refund
      </h2>
      <p className="text-xs text-[#43483f] mt-1 leading-relaxed">
        Zero hidden restocking fees. Hassle-free exchanges and rapid compensation across Bangladesh.
      </p>

      {/* Timeline Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#E2DED8]/70 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-[#4b6723]">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            <span className="text-[11px] font-bold uppercase">Return Window</span>
          </div>
          <p className="mt-1.5 text-base font-extrabold text-[#181C1A]">14 Days</p>
          <p className="text-[11px] text-[#43483f] leading-tight mt-0.5">
            Hassle-free return &amp; instant swap approval.
          </p>
        </div>
        <div className="rounded-2xl border border-[#E2DED8]/70 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-[#4b6723]">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span className="text-[11px] font-bold uppercase">Return Shipping</span>
          </div>
          <p className="mt-1.5 text-base font-extrabold text-[#181C1A]">Free Inside Dhaka</p>
          <p className="text-[11px] text-[#43483f] leading-tight mt-0.5">
            Free doorstep pickup; actual courier rate outside.
          </p>
        </div>
      </div>

      {/* Refund Channels & Exact SLAs */}
      <div className="mt-3.5 rounded-2xl border border-[#E2DED8] bg-white p-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#43483f] mb-3 flex items-center justify-between">
          <span>Guaranteed Refund Timelines</span>
          <span className="text-[10px] font-semibold text-[#4b6723]">SLA Monitored</span>
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-[#F8FAF7] p-2.5 border border-[#E2DED8]/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-700 font-bold text-xs">
                bK
              </div>
              <div>
                <p className="text-xs font-bold text-[#181C1A]">bKash / Nagad Instant Transfer</p>
                <p className="text-[10px] text-[#43483f]">Automated gateway disbursement</p>
              </div>
            </div>
            <span className="rounded-full bg-[#EAF7D8] px-2 py-0.5 text-[11px] font-bold text-[#1c3a13]">
              24 – 48 Hours
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#F8FAF7] p-2.5 border border-[#E2DED8]/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#181C1A]">Visa / MasterCard / AMEX</p>
                <p className="text-[10px] text-[#43483f]">Direct credit to statement</p>
              </div>
            </div>
            <span className="rounded-full bg-[#e3e2e0] px-2 py-0.5 text-[11px] font-bold text-[#181C1A]">
              3 – 5 Days
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#F8FAF7] p-2.5 border border-[#E2DED8]/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                <span className="material-symbols-outlined text-[18px]">payments</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#181C1A]">Cash on Delivery Orders</p>
                <p className="text-[10px] text-[#43483f]">
                  Minsah Wallet or instant courier payout
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#EAF7D8] px-2 py-0.5 text-[11px] font-bold text-[#1c3a13]">
              Instant
            </span>
          </div>
        </div>
      </div>

      {/* Return Eligibility Checklist */}
      <div className="mt-3.5 rounded-2xl border border-[#E2DED8]/70 bg-[#F8FAF7] p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#181C1A] mb-2.5">
          Eligibility Criteria
        </h3>
        <div className="space-y-2 text-xs text-[#43483f]">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#4b6723] text-[16px] shrink-0 mt-0.5">
              check_circle
            </span>
            <span>
              <strong>Unopened:</strong> Outer safety wrap, tamper-evident seals intact, original box
              included.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#4b6723] text-[16px] shrink-0 mt-0.5">
              check_circle
            </span>
            <span>
              <strong>Damaged / Incorrect:</strong> Notify us within 48 hours of courier delivery
              with unboxing photo/video.
            </span>
          </div>
        </div>

        {/* 3-Step Flow */}
        <div className="mt-4 pt-3 border-t border-[#E2DED8]/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#181C1A] mb-3">
            Simple 3-Step Process
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2 border border-[#E2DED8]/40 shadow-xs">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4b6723] text-[11px] font-bold text-white mb-1">
                1
              </span>
              <p className="text-[10px] font-bold text-[#181C1A]">Tap Request</p>
            </div>
            <div className="rounded-xl bg-white p-2 border border-[#E2DED8]/40 shadow-xs">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4b6723] text-[11px] font-bold text-white mb-1">
                2
              </span>
              <p className="text-[10px] font-bold text-[#181C1A]">Doorstep Pickup</p>
            </div>
            <div className="rounded-xl bg-white p-2 border border-[#E2DED8]/40 shadow-xs">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#4b6723] text-[11px] font-bold text-white mb-1">
                3
              </span>
              <p className="text-[10px] font-bold text-[#181C1A]">Refund Credited</p>
            </div>
          </div>
          <Link
            href="/account/orders"
            className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1c3a13] px-4 py-2.5 text-xs font-bold text-[#D4F6A2] shadow-xs hover:opacity-95 transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">assignment_return</span>
            1-Tap Initiate Return Request
          </Link>
        </div>
      </div>
    </section>
  );
}
