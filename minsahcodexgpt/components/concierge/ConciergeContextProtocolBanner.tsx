'use client';

import { Key } from 'lucide-react';

interface ConciergeContextProtocolBannerProps {
  caseId?: string;
  userPhone?: string;
}

export function ConciergeContextProtocolBanner({
  caseId = 'DH-9482',
  userPhone = '+880 1712–345678',
}: ConciergeContextProtocolBannerProps) {
  return (
    <div className="bg-[#E8F0E5]/70 rounded-2xl p-3.5 flex flex-col gap-1.5 border border-[#E2DED8]/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[#062402]">
          <Key className="w-4 h-4 text-[#4b6723]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#062402]">
            Pre-attached Context Protocol
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white text-[#062402] font-mono text-[10px] font-bold shadow-xs">
          Case #{caseId}
        </span>
      </div>

      <p className="text-[12px] leading-relaxed text-[#5A615D]">
        Your verified phone number <strong className="text-[#062402] font-semibold">{userPhone}</strong> is linked to this session, allowing our Gulshan-2 concierge desk to immediately access your account and order details.
      </p>
    </div>
  );
}
