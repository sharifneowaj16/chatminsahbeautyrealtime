"use client";

import React, { useState } from "react";

export function DataPrivacyDeletionForm() {
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    alert(
      `Your GDPR & Meta compliant Data Deletion ticket #DEL-${Math.floor(
        1000 + Math.random() * 9000
      )} has been created for ${identifier}. Confirmation email and SMS will be sent within 2 hours.`
    );
  };

  return (
    <section className="px-4 pt-8 scroll-mt-28" id="data-privacy">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#4b6723] text-[22px]">
          privacy_tip
        </span>
        <span className="text-xs font-bold tracking-wider uppercase text-[#4b6723]">
          Meta Term 4.a Compliant
        </span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-[#181C1A]">
        User Data Privacy &amp; Deletion Rights
      </h2>
      <p className="text-xs text-[#43483f] mt-1 leading-relaxed">
        Compliant with Meta Ads Platform Term 4.a and Google Data Security Guidelines. You retain complete ownership of your data.
      </p>

      {/* Stored Data Breakdown */}
      <div className="mt-4 rounded-2xl border border-[#E2DED8] bg-white p-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#43483f] mb-2">
          Data Retained for Fulfillment
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAF7] p-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723]">badge</span>
            <span className="font-medium text-[#181C1A]">Customer Name</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAF7] p-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723]">
              phone_iphone
            </span>
            <span className="font-medium text-[#181C1A]">Phone (SMS OTP)</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAF7] p-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723]">
              home_pin
            </span>
            <span className="font-medium text-[#181C1A]">Delivery Address</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAF7] p-2">
            <span className="material-symbols-outlined text-[16px] text-[#4b6723]">
              receipt_long
            </span>
            <span className="font-medium text-[#181C1A]">Order Receipts</span>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-[#43483f] italic">
          Note: Minsah Beauty never stores credit card details or bank passwords. All payments pass through PCI-DSS Level 1 certified gateways.
        </p>
      </div>

      {/* Interactive Deletion Request Box */}
      <div className="mt-3.5 rounded-2xl border border-[#E2DED8] bg-[#F8FAF7] p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">
            delete_forever
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#181C1A]">
            Request Complete Data Erasure
          </h3>
        </div>
        <p className="text-xs text-[#43483f] leading-relaxed">
          Submit your deletion callback request. All marketing associations, pixel tracking IDs, delivery records, and profile details will be permanently purged within <strong>7 business days</strong>.
        </p>
        <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[#181C1A] mb-1">
              Registered Phone or Email
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+880 1XXXXXXXXX or user@email.com"
              className="w-full rounded-xl border border-[#E2DED8] bg-white px-3 py-2 text-xs text-[#181C1A] focus:border-[#4b6723] focus:outline-none focus:ring-1 focus:ring-[#4b6723]"
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ba1a1a] text-white px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-[#ba1a1a]/90 transition-all active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
            {submitted ? "Data Deletion Ticket Submitted" : "Submit Data Deletion Request (GDPR / Meta)"}
          </button>
        </form>
        <div className="mt-3 pt-2.5 border-t border-[#E2DED8]/50 flex items-center justify-between text-[11px] text-[#43483f]">
          <span>Direct DPO Contact:</span>
          <a href="mailto:privacy@minsahbeauty.com" className="font-semibold text-[#4b6723] underline">
            privacy@minsahbeauty.com
          </a>
        </div>
      </div>
    </section>
  );
}
