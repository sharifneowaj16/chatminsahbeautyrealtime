'use client';

import { Scale } from 'lucide-react';

export function CookieComplianceBanner() {
  return (
    <div className="w-full bg-[#E8F0E5] text-[#062402] rounded-full px-3 py-1.5 flex items-center gap-2 mb-3 border border-[#B5C4BB]/30">
      <Scale className="w-4 h-4 text-[#4b6723] shrink-0 ml-1" />
      <span className="text-[10px] text-[#5A615D] truncate uppercase tracking-wider font-bold">
        GDPR, Meta 4.a &amp; Bangladesh Cyber Compliance Ready • 256-Bit TLS
      </span>
    </div>
  );
}
