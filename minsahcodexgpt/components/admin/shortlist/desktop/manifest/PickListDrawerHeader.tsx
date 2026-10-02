'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';

interface PickListDrawerHeaderProps {
  batchNumber: string;
  selectedUnitsCount: number;
  hubsCovered: string;
  onOpenThermalSlip: () => void;
  onClose: () => void;
}

export const PickListDrawerHeader: React.FC<PickListDrawerHeaderProps> = ({
  batchNumber,
  selectedUnitsCount,
  hubsCovered,
  onOpenThermalSlip,
  onClose,
}) => {
  return (
    <div className="p-4 border-b border-[#1b2537] bg-[#0c1322] flex items-center justify-between select-none">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold uppercase">
            Manifest #{batchNumber}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {selectedUnitsCount} Units • {hubsCovered}
          </span>
        </div>
        <h2 className="text-sm font-bold text-white mt-1">
          Wholesale Purchase Itinerary
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenThermalSlip}
          className="px-2.5 py-1.5 rounded-md bg-[#132338] hover:bg-[#1c3350] border border-[#213a5a] text-indigo-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Print 80mm Thermal Pick Slip"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>80mm Slip</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md bg-[#111928] hover:bg-[#1a263c] border border-[#1e2c45] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
