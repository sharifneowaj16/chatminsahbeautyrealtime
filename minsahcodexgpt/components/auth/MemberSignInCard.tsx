"use client";

import React from "react";

interface MemberSignInCardProps {
  phone: string;
  onChangePhone: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToSignUp?: () => void;
  isLoading?: boolean;
}

export function MemberSignInCard({
  phone,
  onChangePhone,
  onSubmit,
  onSwitchToSignUp,
  isLoading = false,
}: MemberSignInCardProps) {
  return (
    <div className="space-y-4">
      {/* Brand Header inside card */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] font-bold text-[11px] border border-[#4b6723]/20 shadow-xs mb-1">
          <span className="material-symbols-outlined text-[14px] text-[#4b6723]">
            verified_user
          </span>
          Minsah VIP Member Access
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#062402] tracking-tight">
          Welcome to Minsah Beauty
        </h2>
        <p className="text-xs text-[#43483f] max-w-xs mx-auto leading-relaxed">
          Sign in with your mobile number to view orders, redeem Glow Points, and unlock member
          discounts.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-3.5 pt-1">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-[#062402]">Mobile Number</label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none pr-1 border-r border-[#E2DED8] pr-2.5">
              <span className="text-base">🇧🇩</span>
              <span className="text-xs font-bold text-[#062402]">+880</span>
            </div>
            <input
              type="tel"
              required
              autoFocus
              value={phone}
              onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, ""))}
              placeholder="1712-345678"
              maxLength={11}
              className="w-full pl-24 pr-4 py-3 rounded-2xl bg-[#F8FAF7] text-sm text-[#1a1c1a] font-semibold border border-[#E2DED8] focus:border-[#4b6723] focus:ring-2 focus:ring-[#4b6723]/20 focus:outline-none transition-all shadow-inner"
            />
          </div>
          <span className="text-[10px] text-[#43483f] flex items-center gap-1 pt-0.5">
            <span className="material-symbols-outlined text-[12px] text-[#4b6723]">
              lock
            </span>
            Instant 6-digit OTP code sent via SMS &amp; WhatsApp
          </span>
        </div>

        <button
          type="submit"
          disabled={phone.length < 9 || isLoading}
          className="w-full py-3.5 px-4 rounded-full bg-[#062402] hover:bg-[#1c3a13] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin text-[#ccee9b]">
                refresh
              </span>
              <span>Sending Verification Code...</span>
            </>
          ) : (
            <>
              <span>Send Verification Code</span>
              <span className="material-symbols-outlined text-[16px] text-[#ccee9b]">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      {onSwitchToSignUp && (
        <p className="text-center text-xs text-[#43483f] pt-1">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-[#1c3a13] font-bold hover:underline cursor-pointer ml-1"
          >
            Sign Up Now
          </button>
        </p>
      )}

      {/* Trust Guarantee Badges */}
      <div className="pt-2 border-t border-[#E2DED8]/60 grid grid-cols-2 gap-2 text-[11px] text-[#43483f]">
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/40">
          <span className="material-symbols-outlined text-[16px] text-[#4b6723]">
            workspace_premium
          </span>
          <span className="font-semibold text-[#062402]">100% Authentic Beauty</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/40">
          <span className="material-symbols-outlined text-[16px] text-[#4b6723]">
            bolt
          </span>
          <span className="font-semibold text-[#062402]">1-Tap Fast Checkout</span>
        </div>
      </div>
    </div>
  );
}
