'use client';

import { ShieldCheck } from 'lucide-react';

export function ConciergeTrustFooter() {
  return (
    <div className="flex flex-col items-center text-center gap-1 pt-1 pb-1">
      <div className="flex items-center gap-1.5 text-[#5A615D] text-[11px]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#4b6723]" />
        <span className="font-semibold text-[#062402]">
          End-to-end encrypted direct connection
        </span>
        <span>•</span>
        <span>Zero bot automation</span>
      </div>

      <p className="text-[11px] text-[#5A615D]/80">
        Dhaka Central Concierge Desk, Gulshan-2 • Operating hours: 9:00 AM – 11:00 PM BST
      </p>
    </div>
  );
}
