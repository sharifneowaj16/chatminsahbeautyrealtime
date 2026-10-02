'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';
import { ShortlistPriorityStar } from '@/components/admin/shortlist/shared/ShortlistPriorityStar';

interface ShortlistProductSpecCellProps {
  sku: WholesaleSkuRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onTogglePriority?: (skuId: string) => void;
}

export const ShortlistProductSpecCell: React.FC<ShortlistProductSpecCellProps> = ({
  sku,
  isSelected,
  onToggleSelect,
  onTogglePriority,
}) => {
  return (
    <td className="py-2.5 px-3 align-top">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 rounded bg-[#071321] border-slate-600 text-indigo-600 focus:outline-none cursor-pointer mt-1 flex-shrink-0 accent-indigo-600"
        />

        <div className="w-11 h-11 rounded-md bg-[#040b14] border border-[#17273a] overflow-hidden flex-shrink-0 relative">
          {sku.thumbnailUrl ? (
            <img
              src={sku.thumbnailUrl}
              alt={sku.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0d1c2d] text-indigo-400 font-mono text-[10px] font-bold">
              {sku.sku.slice(0, 3)}
            </div>
          )}
          <span className="absolute bottom-0 right-0 bg-[#040b14]/90 text-[8px] font-mono px-0.5 text-indigo-400 font-bold">
            {sku.volumeSpec}
          </span>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white leading-tight truncate text-xs">
              {sku.title}
            </span>
            <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[9px] font-semibold uppercase">
              {sku.variantOrShade}
            </span>
            {onTogglePriority && (
              <ShortlistPriorityStar
                isUrgent={sku.priority === 'URGENT'}
                onToggle={(e) => {
                  e.stopPropagation();
                  onTogglePriority(sku.id);
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] text-slate-400">
            <span className="text-indigo-400 font-semibold">{sku.sku}</span>
            <span>•</span>
            <span>{sku.barcode}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="px-1 py-0.2 rounded bg-[#0d1d2e] border border-[#16273b] text-[9px] text-slate-300 font-mono">
              {sku.categoryTag}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {sku.batchFormulaNote}
            </span>
          </div>
        </div>
      </div>
    </td>
  );
};
