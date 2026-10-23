'use client';

import { Plane } from 'lucide-react';

interface IncheonFlightRestockPillProps {
  arrivalText?: string;
  batchTag?: string;
}

export function IncheonFlightRestockPill({
  arrivalText = 'Fresh Batch Restock: ৩ দিনের মধ্যে (ইন-ট্রানজিট)',
  batchTag = 'May Batch',
}: IncheonFlightRestockPillProps) {
  return (
    <div className="p-2.5 rounded-full bg-[#e9e8e5] flex items-center justify-between text-[#1a1c1a] px-3.5 border border-[#E2DED8]/60">
      <div className="flex items-center gap-2 min-w-0">
        <Plane className="w-4 h-4 text-[#4b6723] shrink-0" />
        <span className="text-[11px] font-bold truncate">
          {arrivalText}
        </span>
      </div>
      <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold shrink-0">
        {batchTag}
      </span>
    </div>
  );
}
