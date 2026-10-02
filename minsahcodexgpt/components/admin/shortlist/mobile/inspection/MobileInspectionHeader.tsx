'use client';

import React from 'react';
import { ArrowLeft, Share2, Clock } from 'lucide-react';

interface MobileInspectionHeaderProps {
  orderNumber: string;
  onBack: () => void;
  timeLeftStr?: string;
  cutoffStr?: string;
}

export const MobileInspectionHeader: React.FC<MobileInspectionHeaderProps> = ({
  orderNumber,
  onBack,
  timeLeftStr = '42m left',
  cutoffStr = 'Cutoff: 3:30 PM Today',
}) => {
  return (
    <div className="px-4 pt-4 pb-3 flex flex-col gap-3 bg-[#0d1c2d] border-b border-[#172a3e] shadow-sm select-none">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] text-indigo-300 active:scale-95 transition text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Shortlist</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Urgent Dispatch
          </span>
          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-[#122131] flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition cursor-pointer"
            aria-label="Share Slip"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold font-mono">
            Manifest Reference
          </span>
          <h1 className="font-mono text-xl text-white font-bold tracking-tight">
            {orderNumber}
          </h1>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeftStr}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{cutoffStr}</span>
        </div>
      </div>
    </div>
  );
};
