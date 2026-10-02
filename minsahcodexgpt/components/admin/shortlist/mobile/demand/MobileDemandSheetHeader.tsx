// components/admin/shortlist/mobile/demand/MobileDemandSheetHeader.tsx
'use client';

import React from 'react';
import { X } from 'lucide-react';

export interface MobileDemandSheetHeaderProps {
  skuCode: string;
  itemTitle?: string;
  title?: string;
  variant?: string;
  volumeSpec?: string;
  totalOrders?: number;
  totalDemand: number;
  pickedQty: number;
  remainingQty?: number;
  onClose: () => void;
}

export const MobileDemandSheetHeader: React.FC<MobileDemandSheetHeaderProps> = ({
  skuCode,
  itemTitle,
  title,
  variant,
  volumeSpec,
  totalOrders,
  totalDemand,
  pickedQty,
  remainingQty,
  onClose,
}) => {
  const displayTitle = title || itemTitle || 'Item';
  const rem = remainingQty ?? Math.max(0, totalDemand - pickedQty);
  const percent = totalDemand > 0 ? Math.min(100, Math.round((pickedQty / totalDemand) * 100)) : 0;

  return (
    <div className="px-4 pb-3 border-b border-[#1c2b3c] flex items-start justify-between gap-2 shrink-0 select-none">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold tracking-wider">
            {skuCode}
          </span>
          {totalOrders !== undefined && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
              {totalOrders} Orders • {totalDemand} pcs Total
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
            {pickedQty} Acquired / {rem} Left ({percent}%)
          </span>
        </div>

        <h2 className="text-base font-bold text-white leading-tight truncate">
          {displayTitle}
        </h2>

        {(variant || volumeSpec) && (
          <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
            {variant} {volumeSpec ? `• ${volumeSpec}` : ''}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-[#122131] hover:bg-[#1a2f45] text-slate-400 hover:text-white flex items-center justify-center shrink-0 transition cursor-pointer"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
export default MobileDemandSheetHeader;
