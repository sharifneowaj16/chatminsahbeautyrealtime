'use client';

import React from 'react';
import { WholesaleSkuRow } from '@/app/admin/shortlist/types';

interface ShortlistCostProfitCellProps {
  sku: WholesaleSkuRow;
}

export const ShortlistCostProfitCell: React.FC<ShortlistCostProfitCellProps> = ({ sku }) => {
  return (
    <td className="py-2.5 px-3 align-top font-mono text-[11px]">
      <div className="space-y-0.5 bg-[#050e18] p-1.5 rounded-md border border-[#142436]">
        <div className="flex justify-between text-slate-400">
          <span className="text-[10px]">Wholesale:</span>
          <span className="text-white font-bold">
            ৳{sku.financials.unitCost.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span className="text-[10px]">
            Batch ({sku.requiredQuantity}x):
          </span>
          <span className="text-amber-400 font-bold">
            ৳{sku.financials.totalCost.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span className="text-[10px]">Retail:</span>
          <span className="text-slate-200">
            ৳{sku.financials.retailValue.toLocaleString()}
          </span>
        </div>
        <div className="pt-1 mt-0.5 border-t border-[#142436] flex justify-between">
          <span className="text-emerald-400 font-bold text-[10px]">Net:</span>
          <span className="text-emerald-400 font-bold">
            +৳{sku.financials.netProfit.toLocaleString()} (
            {Math.round(sku.financials.marginPercent)}%)
          </span>
        </div>
      </div>
    </td>
  );
};
