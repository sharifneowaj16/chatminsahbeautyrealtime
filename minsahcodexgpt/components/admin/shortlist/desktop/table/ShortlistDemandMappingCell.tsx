'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

interface ShortlistDemandMappingCellProps {
  sku: WholesaleSkuRow;
}

export const ShortlistDemandMappingCell: React.FC<ShortlistDemandMappingCellProps> = ({ sku }) => {
  return (
    <td className="py-2.5 px-3 align-top">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold text-white font-mono">
            {sku.requiredQuantity} pcs
          </span>
          <span
            className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase ${
              sku.demandTag === 'Urgent Stock'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : sku.demandTag === 'Bulk Source'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {sku.demandTag}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {sku.linkedOrders.map((ord, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#050e18] border border-[#142336] font-mono text-[10px]"
            >
              <span className="text-indigo-400 truncate">{ord.orderNumber}</span>
              <span
                className={
                  ord.shippingType === 'Express'
                    ? 'text-rose-400 font-bold text-[9px]'
                    : 'text-slate-400 text-[9px]'
                }
              >
                {ord.quantity} pc{ord.quantity > 1 ? 's' : ''} {ord.shippingType || ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </td>
  );
};
