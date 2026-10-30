'use client';

import { Plane } from 'lucide-react';

interface IncheonFlightRestockPillProps {
  arrivalText?: string;
  batchTag?: string;
}

export function IncheonFlightRestockPill({
  arrivalText = 'Fresh Batch Restock: Within 3 business days (In-Transit)',
  batchTag = 'Air Cargo',
}: IncheonFlightRestockPillProps) {
  return (
    <div className="p-2.5 rounded-full bg-[#FAF6F2] flex items-center justify-between text-[#2D1F18] px-3.5 border border-[#EADFD5]">
      <div className="flex items-center gap-2 min-w-0">
        <Plane className="w-4 h-4 text-emerald-700 shrink-0" />
        <span className="text-[11px] font-bold truncate">
          {arrivalText}
        </span>
      </div>
      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold shrink-0">
        {batchTag}
      </span>
    </div>
  );
}
