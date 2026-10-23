'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ChevronRight, Download, LogOut } from 'lucide-react';

interface AccountPrivacyDangerCardProps {
  onDownloadData?: () => void;
  onLogout?: () => void;
}

export default function AccountPrivacyDangerCard({
  onDownloadData,
  onLogout,
}: AccountPrivacyDangerCardProps) {
  return (
    <section className="w-full bg-[#F8FAF7] rounded-3xl p-5 shadow-xs space-y-4 border border-[#E2DED8]/60 pb-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#F2F6F0] flex items-center justify-center text-[#5A615D]">
          <ShieldAlert className="w-4 h-4 text-[#4b6723]" />
        </div>
        <h3 className="text-sm text-[#062402] font-bold">Privacy &amp; Account Actions</h3>
      </div>

      <div className="space-y-2">
        <Link
          href="/marketing/terms"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-[#F2F6F0] transition-colors border border-[#E2DED8]/50 shadow-2xs"
        >
          <span className="text-xs text-[#062402] font-semibold">
            Cookie &amp; Privacy Preferences (GDPR)
          </span>
          <ChevronRight className="w-4 h-4 text-[#5A615D]" />
        </Link>

        <button
          type="button"
          onClick={onDownloadData}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-[#F2F6F0] transition-colors border border-[#E2DED8]/50 shadow-2xs text-left"
        >
          <span className="text-xs text-[#062402] font-semibold">
            Download Account Data (.JSON)
          </span>
          <Download className="w-4 h-4 text-[#5A615D]" />
        </button>

        <Link
          href="/data-deletion"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-red-50 transition-colors border border-[#E2DED8]/50 shadow-2xs group"
        >
          <span className="text-xs text-[#ba1a1a] font-semibold">
            Request Account Deletion
          </span>
          <ChevronRight className="w-4 h-4 text-[#ba1a1a]" />
        </Link>
      </div>

      {/* Log Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="w-full h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Account</span>
        </button>
      </div>
    </section>
  );
}
