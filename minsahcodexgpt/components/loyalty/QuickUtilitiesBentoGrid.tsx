"use client";

import React from "react";
import Link from "next/link";

interface QuickUtilitiesBentoGridProps {
  onOpenConcierge?: () => void;
  onOpenAuthenticator?: () => void;
  onSignOut?: () => void;
}

export function QuickUtilitiesBentoGrid({
  onOpenConcierge,
  onOpenAuthenticator,
  onSignOut,
}: QuickUtilitiesBentoGridProps) {
  const handleConciergeClick = (e: React.MouseEvent) => {
    if (onOpenConcierge) {
      e.preventDefault();
      onOpenConcierge();
    } else {
      window.dispatchEvent(new CustomEvent("minsah:open-concierge-mobile"));
    }
  };

  const handleAuthClick = (e: React.MouseEvent) => {
    if (onOpenAuthenticator) {
      e.preventDefault();
      onOpenAuthenticator();
    } else {
      alert("Authenticity QR Authenticator is launching. Scanning verification signature...");
    }
  };

  const handleSignOutClick = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      if (confirm("Are you sure you want to sign out from your Minsah Beauty account?")) {
        window.location.href = "/";
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* 2x2 Quick Utilities Bento Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Saved Addresses */}
        <Link
          href="/account/settings"
          className="bg-[#F2F6F0] rounded-2xl p-3 shadow-xs border border-[#E2DED8]/60 hover:bg-[#E8F0E5] transition-colors flex flex-col justify-between h-20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-[#062402] text-[18px]">
              home_pin
            </span>
            <span className="material-symbols-outlined text-[#43483f] text-[15px]">
              arrow_forward
            </span>
          </div>
          <div>
            <p className="font-title-md text-[12px] text-[#062402] font-bold leading-tight">
              Saved Addresses
            </p>
            <p className="font-label-md text-[10px] text-[#43483f] truncate">
              Banani Hub (Default)
            </p>
          </div>
        </Link>

        {/* QR Authenticator */}
        <button
          type="button"
          onClick={handleAuthClick}
          className="bg-[#EAF7D8]/80 text-left rounded-2xl p-3 shadow-xs border border-[#4b6723]/20 hover:bg-[#EAF7D8] transition-colors flex flex-col justify-between h-20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="material-symbols-outlined text-[#4b6723] text-[18px]">
              qr_code_scanner
            </span>
            <span className="px-1.5 py-0.2 rounded bg-[#4b6723] text-white font-label-md text-[8px] font-bold">
              Authentic
            </span>
          </div>
          <div>
            <p className="font-title-md text-[12px] text-[#062402] font-bold leading-tight">
              QR Authenticator
            </p>
            <p className="font-label-md text-[10px] text-[#1c3a13] truncate">
              Verify genuine batch
            </p>
          </div>
        </button>

        {/* Order Tracking */}
        <Link
          href="/account/orders"
          className="bg-[#F2F6F0] rounded-2xl p-3 shadow-xs border border-[#E2DED8]/60 hover:bg-[#E8F0E5] transition-colors flex flex-col justify-between h-20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-[#062402] text-[18px]">
              inventory_2
            </span>
            <span className="material-symbols-outlined text-[#43483f] text-[15px]">
              arrow_forward
            </span>
          </div>
          <div>
            <p className="font-title-md text-[12px] text-[#062402] font-bold leading-tight">
              Order Tracking
            </p>
            <p className="font-label-md text-[10px] text-[#43483f] truncate">
              Cargo &amp; Dhaka Live Map
            </p>
          </div>
        </Link>

        {/* Dhaka Concierge */}
        <button
          type="button"
          onClick={handleConciergeClick}
          className="bg-[#F2F6F0] text-left rounded-2xl p-3 shadow-xs border border-[#E2DED8]/60 hover:bg-[#E8F0E5] transition-colors flex flex-col justify-between h-20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full">
            <span className="material-symbols-outlined text-[#4b6723] text-[18px]">
              support_agent
            </span>
            <span className="material-symbols-outlined text-[#43483f] text-[15px]">
              arrow_forward
            </span>
          </div>
          <div>
            <p className="font-title-md text-[12px] text-[#062402] font-bold leading-tight">
              Dhaka Concierge
            </p>
            <p className="font-label-md text-[10px] text-[#43483f] truncate">
              WhatsApp • 9 AM - 11 PM
            </p>
          </div>
        </button>
      </div>

      {/* Compact Sign Out Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSignOutClick}
          className="w-full py-2.5 rounded-xl bg-[#F2F6F0] text-[#ba1a1a] hover:bg-[#ffdad6]/50 font-label-md text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#E2DED8]/60 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );
}
