'use client';

import React from 'react';
import { DollarSign, BarChart2 } from 'lucide-react';

export interface ProductAiResearchNotesProps {
  marketNote?: string;
  competitionNote?: string;
}

export function ProductAiResearchNotes({
  marketNote,
  competitionNote,
}: ProductAiResearchNotesProps) {
  if (!marketNote && !competitionNote) return null;

  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      {marketNote && (
        <div className="bg-[#161824] border border-emerald-500/20 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Market Price Research
          </p>
          <p className="text-xs text-[#d0d6e0] leading-relaxed">{marketNote}</p>
        </div>
      )}

      {competitionNote && (
        <div className="bg-[#161824] border border-amber-500/20 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Competition Insight
          </p>
          <p className="text-xs text-[#d0d6e0] leading-relaxed">{competitionNote}</p>
        </div>
      )}
    </div>
  );
}
