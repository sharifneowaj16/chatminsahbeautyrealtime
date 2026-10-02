'use client';

import React from 'react';
import { User, Phone, CheckCircle2, Navigation } from 'lucide-react';
import { QuickPhoneAction } from '../customer/QuickPhoneAction';

export interface RunnerAssignmentChipProps {
  runnerName: string;
  runnerCode?: string;
  phone?: string;
  status?: 'active' | 'in_transit' | 'idle' | string;
  compact?: boolean;
  className?: string;
}

export const RunnerAssignmentChip: React.FC<RunnerAssignmentChipProps> = ({
  runnerName,
  runnerCode = 'MSB-R04',
  phone,
  status = 'active',
  compact = false,
  className = '',
}) => {
  const isTransit = status === 'in_transit' || status === 'active';

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs ${className}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="font-bold text-white">{runnerName}</span>
        <span className="text-[10px] font-mono text-slate-400">({runnerCode})</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center font-bold text-rose-300 text-xs shrink-0 shadow-sm">
          {runnerName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h5 className="text-xs font-bold text-white">{runnerName}</h5>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {runnerCode}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
            <Navigation className="w-2.5 h-2.5" />
            Active Market Runner
          </span>
        </div>
      </div>

      {phone && <QuickPhoneAction phone={phone} size="sm" />}
    </div>
  );
};

export default RunnerAssignmentChip;
