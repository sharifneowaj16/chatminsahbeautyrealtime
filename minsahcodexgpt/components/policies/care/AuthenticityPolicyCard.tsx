"use client";

import React from "react";
import Image from "next/image";

export function AuthenticityPolicyCard() {
  const handleScanClick = () => {
    alert("Launching Authenticity QR Scanner... Camera active for batch verification.");
  };

  return (
    <section className="px-4 pt-5 scroll-mt-28" id="authenticity">
      {/* Hero Accent Image */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E2DED8]/60 bg-[#F8FAF7] shadow-xs mb-4">
        <div className="relative h-36 w-full">
          <Image
            src="/images/categories/Skincare.png"
            alt="Authentic Worldwide Skincare"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062402]/85 via-[#062402]/20 to-transparent flex items-end p-3.5">
            <div className="text-white">
              <span className="rounded-md bg-[#D4F6A2] px-2 py-0.5 text-[10px] font-bold text-[#062402] uppercase tracking-wider">
                100% Genuine Worldwide
              </span>
              <p className="text-xs font-semibold text-white/95 mt-1">
                Direct authorized importation with cryptographic holographic tracking.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#4b6723] text-[22px]">verified</span>
        <span className="text-xs font-bold tracking-wider uppercase text-[#4b6723]">
          Anti-Counterfeit Mandate
        </span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-[#181C1A]">
        100% Authenticity Guaranteed
      </h2>
      <p className="text-xs text-[#43483f] mt-1 leading-relaxed">
        Direct Sourcing Guarantee: Authentic authorized brand laboratories worldwide. Every container
        imported directly through bonded customs.
      </p>

      {/* 10x Pledge Card */}
      <div className="mt-4 rounded-2xl border border-[#ccee9b] bg-[#EAF7D8]/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#062402] text-[#D4F6A2]">
            <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1c3a13]">
              Strict 10x Money-Back Anti-Counterfeit Pledge
            </h3>
            <p className="mt-1 text-xs text-[#43483f] leading-relaxed">
              If any product sold by Minsah Beauty is ever proven non-genuine by an authorized
              laboratory, we will refund{" "}
              <span className="font-bold text-[#181C1A]">1000% of your order value</span> with zero
              dispute.
            </p>
          </div>
        </div>
      </div>

      {/* Verification Steps & QR Scanner */}
      <div className="mt-3.5 rounded-2xl border border-[#E2DED8] bg-white p-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#43483f] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[#4b6723]">
            qr_code_scanner
          </span>
          Tamper-Evident Holographic Seal Verification
        </h3>
        <ul className="mt-3 space-y-2.5 text-xs text-[#181C1A]">
          <li className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#4b6723] text-[18px] shrink-0 mt-0.5">
              check_circle
            </span>
            <span>
              <strong>Void-Break Microfilm:</strong> Hologram fractures upon opening; prevents
              bottle refilling or duplicate packaging.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#4b6723] text-[18px] shrink-0 mt-0.5">
              check_circle
            </span>
            <span>
              <strong>Unique Encrypted Serial:</strong> Dynamic serial number registered directly in
              authorized brand manufacturer ledger.
            </span>
          </li>
        </ul>
        <button
          type="button"
          onClick={handleScanClick}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#062402] px-4 py-3 text-xs font-bold text-[#D4F6A2] shadow-md hover:opacity-95 active:scale-[0.99] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
          Scan Package Hologram QR to Verify Batch
        </button>
      </div>
    </section>
  );
}
