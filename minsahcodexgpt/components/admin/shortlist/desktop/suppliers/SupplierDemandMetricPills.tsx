'use client';

import React from 'react';

interface SupplierDemandMetricPillsProps {
  totalUnits: number;
  totalSkus: number;
  totalCost: number;
  acquiredCount: number;
  isFullyAcquired: boolean;
}

export const SupplierDemandMetricPills: React.FC<SupplierDemandMetricPillsProps> = ({
  totalUnits,
  totalSkus,
  totalCost,
  acquiredCount,
  isFullyAcquired,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 my-3 font-mono text-xs">
      <div className="p-2 rounded bg-[#050e18] border border-[#122134]">
        <span className="text-[9px] uppercase text-slate-500 font-bold block">
          To Source
        </span>
        <span className="text-white font-bold text-xs mt-0.5 block truncate">
          {totalUnits} pcs ({totalSkus} SKUs)
        </span>
      </div>
      <div className="p-2 rounded bg-[#050e18] border border-[#122134]">
        <span className="text-[9px] uppercase text-slate-500 font-bold block">
          Cash Float
        </span>
        <span className="text-amber-400 font-bold text-xs mt-0.5 block truncate">
          ৳{totalCost.toLocaleString()}
        </span>
      </div>
      <div className="p-2 rounded bg-[#050e18] border border-[#122134]">
        <span className="text-[9px] uppercase text-slate-500 font-bold block">
          Status
        </span>
        <span
          className={`text-xs font-bold mt-0.5 block truncate ${
            isFullyAcquired ? 'text-emerald-400' : 'text-slate-300'
          }`}
        >
          {acquiredCount}/{totalSkus} Acquired
        </span>
      </div>
    </div>
  );
};
