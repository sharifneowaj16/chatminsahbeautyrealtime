'use client';

import Link from 'next/link';
import { ExternalLink, Trash2, ShieldCheck } from 'lucide-react';

export function CookieRightsLinks() {
  return (
    <div className="flex flex-col gap-2 mb-4 bg-[#f4f3f1] rounded-2xl p-3 border border-[#E2DED8]/60">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/privacy"
          className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-[#062402] text-xs font-bold shadow-xs hover:bg-[#E8F0E5] transition-colors border border-[#E2DED8]/40"
        >
          <span>Read Privacy Policy</span>
          <ExternalLink className="w-3 h-3 text-[#4b6723]" />
        </Link>

        <Link
          href="/delete-data"
          className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-[#062402] text-xs font-bold shadow-xs hover:bg-[#E8F0E5] transition-colors border border-[#E2DED8]/40"
        >
          <span>Request Data Deletion</span>
          <Trash2 className="w-3 h-3 text-rose-600" />
        </Link>

        <Link
          href="/faq"
          className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-[#062402] text-xs font-bold shadow-xs hover:bg-[#E8F0E5] transition-colors border border-[#E2DED8]/40"
        >
          <span>Consumer Protection Act</span>
          <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
        </Link>
      </div>

      <p className="text-[11px] text-[#5A615D] mt-0.5 px-1 leading-snug">
        You can update or withdraw consent anytime under{' '}
        <strong className="text-[#062402]">Account &gt; Settings &gt; Privacy Preferences</strong>.
      </p>
    </div>
  );
}
