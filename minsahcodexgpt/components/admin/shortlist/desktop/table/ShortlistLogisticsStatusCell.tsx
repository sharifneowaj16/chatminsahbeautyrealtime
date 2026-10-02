'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

interface ShortlistLogisticsStatusCellProps {
  sku: WholesaleSkuRow;
}

export const ShortlistLogisticsStatusCell: React.FC<ShortlistLogisticsStatusCellProps> = ({ sku }) => {
  return (
    <td className="py-2.5 px-3 align-top">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-emerald-400 font-bold">
            {sku.pickedQuantity} of {sku.requiredQuantity}
          </span>
          <span className="text-slate-400">{sku.progressPercent}%</span>
        </div>
        <div className="w-full bg-[#040b14] h-1.5 rounded-full overflow-hidden border border-[#142336]">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${sku.progressPercent}%` }}
          />
        </div>
        <span className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-0.5">
          <span className="text-emerald-400 text-[10px]">✓</span>
          {sku.statusNote}
        </span>
      </div>
    </td>
  );
};
