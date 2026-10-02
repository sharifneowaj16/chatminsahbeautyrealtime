'use client';

import React from 'react';
import { CheckCircle2, DollarSign, AlertTriangle } from 'lucide-react';

export interface ProductImportStatsBarProps {
  isParsed: boolean;
  marketNote?: string;
  blockersCount?: number;
}

export function ProductImportStatsBar({
  isParsed,
  marketNote,
  blockersCount = 0,
}: ProductImportStatsBarProps) {
  if (!isParsed) return null;

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2 animate-fadeIn">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-xs font-semibold text-emerald-300">
          JSON Payload Parsed Successfully — Review and verify catalog specifications before saving
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs ml-7 pt-1">
        {marketNote && (
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            Market Reference: {marketNote}
          </span>
        )}

        {blockersCount > 0 && (
          <span className="flex items-center gap-1.5 text-amber-300 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {blockersCount} Action Items / Blockers to verify
          </span>
        )}
      </div>
    </div>
  );
}
