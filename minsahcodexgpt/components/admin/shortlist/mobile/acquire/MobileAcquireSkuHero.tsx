'use client';

import React from 'react';
import { X } from 'lucide-react';

interface MobileAcquireSkuHeroProps {
  sku: string;
  title: string;
  variantOrShade: string;
  volumeSpec?: string;
  remainingQty: number;
  onClose: () => void;
}

export const MobileAcquireSkuHero: React.FC<MobileAcquireSkuHeroProps> = ({
  sku,
  title,
  variantOrShade,
  volumeSpec,
  remainingQty,
  onClose,
}) => {
  return (
    <div className="px-4 pb-3 border-b border-[#1c2b3c] flex items-start justify-between gap-2 shrink-0 select-none">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold tracking-wider">
            {sku}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
            Target: {remainingQty} pcs remaining
          </span>
        </div>
        <h2 className="text-[17px] leading-tight text-white font-extrabold truncate">
          {title}
        </h2>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {variantOrShade} {volumeSpec ? `• ${volumeSpec}` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-9 h-9 rounded-full bg-[#1c2b3c] hover:bg-[#273647] active:scale-90 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition cursor-pointer"
        aria-label="Close Modal"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
