// components/admin/shortlist/desktop/table/ShortlistDesktopHeader.tsx
'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { RunnerAssignmentChip } from '@/components/admin/shortlist/RunnerAssignmentChip';

export interface ShortlistDesktopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  runnerName: string;
  runnerCode: string;
  onRunnerChange: (name: string, code: string) => void;
  batchNumber?: string;
}

export const ShortlistDesktopHeader: React.FC<ShortlistDesktopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  runnerName,
  runnerCode,
  onRunnerChange,
  batchNumber = '24-OCT-01',
}) => {
  return (
    <header className="flex items-center justify-between gap-4 pb-2 border-b border-[#142336] select-none">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
          <span>Wholesale Shortlist</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-normal">
            B2B Procurement Hub
          </span>
        </h1>
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
          LIVE BATCH #{batchNumber}
        </span>
      </div>

      {/* Central High-Density Search Input */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search SKU, item title, barcode, stall name or order #..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#091524] border border-[#17273a] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      </div>

      {/* Runner Assignment & Switcher */}
      <div className="flex items-center gap-2">
        <RunnerAssignmentChip
          runnerName={runnerName}
          runnerCode={runnerCode}
          compact
        />
        <select
          value={runnerName}
          onChange={(e) => {
            const name = e.target.value;
            const code = name === 'Shakil' ? 'MSB-R04' : name === 'Rahim' ? 'MSB-R02' : 'MSB-R01';
            onRunnerChange(name, code);
          }}
          className="bg-[#091524] border border-[#17273a] text-xs text-slate-300 font-mono rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="Shakil">Rig 04 (Shakil)</option>
          <option value="Rahim">Rig 02 (Rahim)</option>
          <option value="Tanvir">Rig 01 (Tanvir)</option>
        </select>
      </div>
    </header>
  );
};
export default ShortlistDesktopHeader;
