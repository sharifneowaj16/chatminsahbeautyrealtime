// components/admin/shortlist/mobile/feed/MobileShortlistTopBar.tsx
'use client';

import React from 'react';
import { RefreshCw, Bell, User } from 'lucide-react';

export interface MobileShortlistTopBarProps {
  runnerName: string;
  runnerBudget?: number;
  spentAmount?: number;
  isSyncing?: boolean;
  onRefresh?: () => void;
  timeStr?: string;
}

export const MobileShortlistTopBar: React.FC<MobileShortlistTopBarProps> = ({
  runnerName,
  runnerBudget = 15000,
  spentAmount = 4500,
  isSyncing = false,
  onRefresh,
}) => {
  const remainingFloat = Math.max(0, runnerBudget - spentAmount);

  return (
    <header className="sticky top-0 z-30 bg-[#071321]/95 backdrop-blur-md border-b border-[#142337] px-3.5 py-2.5 flex items-center justify-between select-none">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-mono font-bold text-xs">
          <User className="w-4 h-4 text-indigo-300" />
        </div>
        <div>
          <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
            <span>Rig 04 ({runnerName})</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span className="text-emerald-400 font-bold">LIVE SYNC</span>
            <span>•</span>
            <span>৳{remainingFloat.toLocaleString()} Float</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onRefresh}
          className="w-8 h-8 rounded-lg bg-[#0d1d2e] hover:bg-[#152a42] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          aria-label="Refresh shortlist"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <button
          type="button"
          className="w-8 h-8 rounded-lg bg-[#0d1d2e] hover:bg-[#152a42] text-slate-300 hover:text-white flex items-center justify-center transition relative cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-2 right-2" />
        </button>
      </div>
    </header>
  );
};
export default MobileShortlistTopBar;
