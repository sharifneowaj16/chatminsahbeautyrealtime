'use client';

import React from 'react';

interface ThermalSlipSummaryTotalsProps {
  totalUnits: number;
  totalSkus: number;
  requiredCashFloat: number;
  settlementMethod: string;
}

export const ThermalSlipSummaryTotals: React.FC<ThermalSlipSummaryTotalsProps> = ({
  totalUnits,
  totalSkus,
  requiredCashFloat,
  settlementMethod,
}) => {
  return (
    <div className="py-2.5 border-b-2 border-dashed border-slate-800 space-y-1 font-bold">
      <div className="flex justify-between text-[11px] font-bold text-slate-800">
        <span>TOTAL UNITS TO PICK:</span>
        <span className="text-black font-extrabold">
          {totalUnits} PCS ({totalSkus} SKUs)
        </span>
      </div>
      <div className="flex justify-between text-xs font-black text-black pt-1 border-t border-slate-300">
        <span>REQUIRED CASH FLOAT:</span>
        <span className="text-sm font-black">
          ৳{requiredCashFloat.toLocaleString()} BDT
        </span>
      </div>
      <div className="text-[9px] text-slate-700 pt-0.5 font-bold">
        Settlement Method: {settlementMethod}
      </div>
    </div>
  );
};
