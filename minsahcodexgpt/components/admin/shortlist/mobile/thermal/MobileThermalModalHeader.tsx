// components/admin/shortlist/mobile/thermal/MobileThermalModalHeader.tsx
'use client';

import React from 'react';
import { ArrowLeft, Share2, X } from 'lucide-react';

export interface MobileThermalModalHeaderProps {
  onClose: () => void;
  onShareClick: () => void;
  dpiStatus?: string;
}

export function MobileThermalModalHeader({
  onClose,
  onShareClick,
  dpiStatus = '203 DPI • READY',
}: MobileThermalModalHeaderProps) {
  return (
    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#172a3e] bg-[#0d1c2d] shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white active:opacity-70 transition text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Shortlist</span>
      </button>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[10px] tracking-wide font-bold">{dpiStatus}</span>
        </span>
        <button
          type="button"
          onClick={onShareClick}
          className="w-8 h-8 rounded-lg bg-[#122131] flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition"
          aria-label="Share Slip"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-[#122131] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
export default MobileThermalModalHeader;
