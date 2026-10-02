'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

interface SupplierSkuItemRowProps {
  sku: WholesaleSkuRow;
  onAcquireSku: (skuId: string) => void;
}

export const SupplierSkuItemRow: React.FC<SupplierSkuItemRowProps> = ({
  sku,
  onAcquireSku,
}) => {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-[#050e18] border border-[#122134] text-xs font-mono">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-indigo-400 font-bold truncate">
          {sku.sku}
        </span>
        <span className="text-white truncate">{sku.title}</span>
        <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] uppercase shrink-0">
          {sku.variantOrShade}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-slate-300 font-bold">
          {sku.requiredQuantity} pcs
        </span>
        <span className="text-amber-300">
          ৳{sku.financials.totalCost.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => onAcquireSku(sku.id)}
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer ${
            sku.isAcquired
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0f2136] hover:bg-indigo-600 text-slate-300 hover:text-white border border-[#1b3452]'
          }`}
        >
          {sku.isAcquired ? '✓' : 'Acquire'}
        </button>
      </div>
    </div>
  );
};
