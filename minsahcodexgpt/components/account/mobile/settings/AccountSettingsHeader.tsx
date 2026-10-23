'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Headphones, User } from 'lucide-react';

interface AccountSettingsHeaderProps {
  onBack?: () => void;
  onOpenSupport?: () => void;
}

export default function AccountSettingsHeader({
  onBack,
  onOpenSupport,
}: AccountSettingsHeaderProps) {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#faf9f6]/90 backdrop-blur-xl shadow-xs border-b border-[#E2DED8]/40">
      <div className="h-16 px-4 flex items-center justify-between">
        <Link
          href="/account"
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-full text-[#062402] hover:bg-[#F2F6F0] active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <h1 className="text-base text-[#062402] font-bold tracking-tight truncate px-2 text-center flex-1 font-sans">
          Account Settings
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Customer Support"
            onClick={onOpenSupport}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#062402] hover:bg-[#F2F6F0] active:scale-95 transition-all"
          >
            <Headphones className="w-4 h-4 text-[#4b6723]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#062402] flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
