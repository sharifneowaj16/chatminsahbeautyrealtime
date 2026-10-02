'use client';

import React from 'react';
import { Wallet } from 'lucide-react';

interface ShortlistFloatBadgeProps {
  allocated: number;
  spent: number;
  currency?: string;
  compact?: boolean;
}

export const ShortlistFloatBadge: React.FC<ShortlistFloatBadgeProps> = ({
  allocated,
  spent,
  currency = '৳',
  compact = false,
}) => {
  const remaining = Math.max(0, allocated - spent);
  const percentUsed = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#091829] border border-[#172c44] text-[11px] font-mono text-slate-300">
        <Wallet className="w-3 h-3 text-emerald-400" />
        <span>{currency}{remaining.toLocaleString()}</span>
        <span className="text-slate-500 text-[10px]">({percentUsed}%)</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#091829] border border-[#172c44]">
      <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
      <div className="flex flex-col font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider">Cash Float:</span>
          <span className="font-bold text-emerald-400">{currency}{remaining.toLocaleString()}</span>
          <span className="text-slate-500 text-[10px]">/ {currency}{allocated.toLocaleString()}</span>
        </div>
        <div className="w-24 h-1 bg-[#102235] rounded-full overflow-hidden mt-0.5">
          <div
            className={`h-full transition-all duration-300 ${
              percentUsed > 80 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>
    </div>
  );
};
