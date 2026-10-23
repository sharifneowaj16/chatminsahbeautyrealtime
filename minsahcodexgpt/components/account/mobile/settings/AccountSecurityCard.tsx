'use client';

import React from 'react';
import Link from 'next/link';
import { KeyRound, ChevronRight, Smartphone } from 'lucide-react';
import type { AccountSettingsSecurity } from './types';

interface AccountSecurityCardProps {
  security: AccountSettingsSecurity;
  onToggle2FA: () => void;
  onChangePassword?: () => void;
}

export default function AccountSecurityCard({
  security,
  onToggle2FA,
  onChangePassword,
}: AccountSecurityCardProps) {
  return (
    <section className="w-full bg-[#F8FAF7] rounded-3xl p-5 shadow-xs space-y-4 border border-[#E2DED8]/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#c7edb5] flex items-center justify-center text-[#062402]">
            <KeyRound className="w-4 h-4" />
          </div>
          <h3 className="text-sm text-[#062402] font-bold">Security &amp; Credentials</h3>
        </div>
        <span className="bg-[#ccee9b] text-[#1c3a13] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          Secure
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {/* 2FA Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold text-[#062402] leading-snug">Two-Factor Authentication</p>
            <p className="text-[11px] text-[#5A615D] leading-tight mt-0.5">
              Instant OTP via SMS &amp; WhatsApp
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={security.twoFactorEnabled}
            onClick={onToggle2FA}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
              security.twoFactorEnabled ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                security.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Password update link */}
        <button
          type="button"
          onClick={onChangePassword}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-[#F2F6F0] transition-colors border border-[#E2DED8]/50 shadow-2xs text-left"
        >
          <div>
            <p className="text-xs font-bold text-[#062402]">Password</p>
            <p className="text-[11px] text-[#5A615D] mt-0.5">
              Last updated {security.passwordLastUpdated}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#5A615D]" />
        </button>

        {/* Active Device Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#E2DED8]/50 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#4b6723]" />
              <span className="text-xs font-bold text-[#062402]">Active Login Device</span>
            </div>
            <Link href="/account/settings" className="text-[11px] text-[#4b6723] font-bold hover:underline">
              Manage Devices
            </Link>
          </div>
          <p className="text-[11px] text-[#5A615D]">
            {security.activeDevice.model} • {security.activeDevice.location} (Current Session)
          </p>
        </div>
      </div>
    </section>
  );
}
