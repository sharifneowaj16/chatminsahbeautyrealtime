'use client';

import React from 'react';
import { ArrowLeft, Printer, X } from 'lucide-react';

interface ThermalSlipDrawerHeaderProps {
  onBackToManifest: () => void;
  onPrint: () => void;
  onClose: () => void;
}

export const ThermalSlipDrawerHeader: React.FC<ThermalSlipDrawerHeaderProps> = ({
  onBackToManifest,
  onPrint,
  onClose,
}) => {
  return (
    <div className="p-3.5 border-b border-[#1b263b] bg-[#0c1220]/95 backdrop-blur-md shrink-0 flex items-center justify-between gap-2 select-none">
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToManifest}
            className="p-1 rounded-md bg-[#132034] hover:bg-[#1c2c47] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Back to Manifest"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
            80mm Pick Slip Preview{' '}
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold border border-indigo-500/30">
              LIVE
            </span>
          </h3>
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1 ml-7">
          <span>ESC/POS 80mm</span>
          <span>•</span>
          <span>203 DPI</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Ready</span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrint}
          className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-[#1a2742] text-slate-300 hover:text-white border border-[#233352] transition-colors cursor-pointer"
          title="Print Immediately"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-[#111a2d] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#233352] transition-colors cursor-pointer"
          title="Close Drawer (ESC)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
