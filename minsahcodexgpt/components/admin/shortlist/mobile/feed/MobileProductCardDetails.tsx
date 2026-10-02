'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MobileProductCardDetailsProps {
  sku: string;
  title: string;
  variantOrShade: string;
  isUrgent: boolean;
  isExpanded: boolean;
}

export const MobileProductCardDetails: React.FC<MobileProductCardDetailsProps> = ({
  sku,
  title,
  variantOrShade,
  isUrgent,
  isExpanded,
}) => {
  return (
    <div className="flex flex-col min-w-0 flex-1 select-none">
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[11px] font-bold text-indigo-400 tracking-wider truncate">
          {sku}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isUrgent && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
              ⚡ URGENT
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      <h3 className="text-xs font-semibold text-white tracking-tight leading-snug truncate mt-0.5">
        {title}
      </h3>

      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[9px] font-semibold uppercase">
          {variantOrShade}
        </span>
      </div>
    </div>
  );
};
