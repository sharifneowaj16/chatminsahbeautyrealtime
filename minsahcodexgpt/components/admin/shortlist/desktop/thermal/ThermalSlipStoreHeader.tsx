'use client';

import React from 'react';

interface ThermalSlipStoreHeaderProps {
  rigId: string;
  hubLocation: string;
  dateTimeStr: string;
  slipNumber: string;
}

export const ThermalSlipStoreHeader: React.FC<ThermalSlipStoreHeaderProps> = ({
  rigId,
  hubLocation,
  dateTimeStr,
  slipNumber,
}) => {
  return (
    <>
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-slate-400">
        <span className="text-[9px] uppercase tracking-widest text-slate-700 font-bold">
          *** ESC/POS 80MM SLIP ***
        </span>
        <span className="text-[9px] font-bold text-slate-700">{rigId}</span>
      </div>

      <div className="text-center space-y-0.5 pb-2.5 border-b-2 border-dashed border-slate-700">
        <div className="text-sm font-extrabold tracking-tight uppercase text-black font-sans">
          MINSAH BEAUTY OPS
        </div>
        <div className="text-[10px] font-bold uppercase text-slate-700">
          Wholesale Sourcing Manifest
        </div>
        <div className="text-[9px] text-slate-700 font-bold mt-1">
          {hubLocation}
        </div>
        <div className="text-[9px] text-slate-700 font-bold">
          {dateTimeStr} • Slip: #{slipNumber}
        </div>
      </div>
    </>
  );
};
