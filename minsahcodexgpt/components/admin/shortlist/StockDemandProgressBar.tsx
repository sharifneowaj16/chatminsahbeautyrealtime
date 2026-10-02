'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface StockDemandProgressBarProps {
  acquired: number;
  needed: number;
  size?: 'sm' | 'md';
  showPercentage?: boolean;
  className?: string;
}

export const StockDemandProgressBar: React.FC<StockDemandProgressBarProps> = ({
  acquired,
  needed,
  size = 'md',
  showPercentage = true,
  className = '',
}) => {
  const safeNeeded = Math.max(1, needed);
  const percent = Math.min(100, Math.round((acquired / safeNeeded) * 100));
  const isComplete = acquired >= needed && needed > 0;
  const isSm = size === 'sm';

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          <span className="font-semibold text-slate-200">{acquired}</span> of{' '}
          <span className="font-semibold text-slate-200">{needed}</span> sourced
        </span>
        {showPercentage && (
          <span
            className={`font-mono text-[11px] font-bold ${
              isComplete ? 'text-emerald-400' : 'text-slate-300'
            }`}
          >
            {percent}%
          </span>
        )}
      </div>

      <div
        className={`w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden ${
          isSm ? 'h-1.5' : 'h-2'
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ${
            isComplete
              ? 'bg-emerald-500'
              : percent > 50
              ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default StockDemandProgressBar;
