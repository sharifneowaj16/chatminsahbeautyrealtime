'use client';

import React from 'react';
import { ArrowRight, Loader2, Lock, ShieldCheck, Zap } from 'lucide-react';

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
      <form onSubmit={onSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <label className="block font-bold text-[#062402]">Mobile Number</label>
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center gap-1.5 border-r border-[#E2DED8] pr-2.5">
              <span>🇧🇩</span>
              <span className="text-xs font-bold text-[#062402]">+880</span>
            </div>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, ''))}
              placeholder="1712345678"
              maxLength={11}
              className="h-11 w-full rounded-2xl border border-[#E2DED8] bg-white pl-24 pr-4 font-semibold text-[#181C1A] focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/15"
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[#5A615D]">
            <Lock className="h-3.5 w-3.5 text-[#4b6723] shrink-0" />
            <span>Instant 6-digit OTP code sent via SMS &amp; WhatsApp</span>
          </p>
        </div>

        <button
          type="submit"
          disabled={phone.length < 9 || isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#062402] px-4 font-bold text-white shadow-sm transition hover:bg-[#1c3a13] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#D4F6A2]" />
              <span>Sending Verification Code...</span>
            </>
          ) : (
            <>
              <span>Send Verification Code</span>
              <ArrowRight className="h-4 w-4 text-[#D4F6A2]" />
            </>
          )}
        </button>
      </form>

      {onSwitchToSignUp ? (
        <p className="text-center text-xs text-[#5A615D]">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="ml-1 font-bold text-[#1c3a13] hover:underline"
          >
            Sign Up Now
          </button>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-t border-[#E2DED8] pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#E2DED8] bg-white p-2.5">
          <ShieldCheck className="h-4 w-4 text-[#4b6723] shrink-0" />
          <span className="text-xs font-semibold text-[#062402]">100% Authentic</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E2DED8] bg-white p-2.5">
          <Zap className="h-4 w-4 text-[#4b6723] shrink-0" />
          <span className="text-xs font-semibold text-[#062402]">1-Tap Checkout</span>
        </div>
      </div>
    </div>
  );
}
