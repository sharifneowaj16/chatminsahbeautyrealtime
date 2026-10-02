'use client';

import React from 'react';

interface ThermalSlipSignaturesProps {
  barcodeString: string;
  runnerName: string;
  dispatchInCharge: string;
}

export const ThermalSlipSignatures: React.FC<ThermalSlipSignaturesProps> = ({
  barcodeString,
  runnerName,
  dispatchInCharge,
}) => {
  return (
    <>
      {/* Simulated High Density Barcode */}
      <div className="py-3 text-center space-y-1">
        <div className="w-full flex justify-center py-1">
          <svg
            className="w-48 h-10"
            preserveAspectRatio="none"
            viewBox="0 0 160 36"
          >
            <rect fill="#0f172a" height="36" width="2" x="4" />
            <rect fill="#0f172a" height="36" width="4" x="8" />
            <rect fill="#0f172a" height="36" width="1" x="14" />
            <rect fill="#0f172a" height="36" width="3" x="17" />
            <rect fill="#0f172a" height="36" width="1" x="22" />
            <rect fill="#0f172a" height="36" width="2" x="25" />
            <rect fill="#0f172a" height="36" width="5" x="30" />
            <rect fill="#0f172a" height="36" width="2" x="37" />
            <rect fill="#0f172a" height="36" width="3" x="41" />
            <rect fill="#0f172a" height="36" width="1" x="46" />
            <rect fill="#0f172a" height="36" width="4" x="49" />
            <rect fill="#0f172a" height="36" width="2" x="55" />
            <rect fill="#0f172a" height="36" width="1" x="59" />
            <rect fill="#0f172a" height="36" width="4" x="62" />
            <rect fill="#0f172a" height="36" width="2" x="68" />
            <rect fill="#0f172a" height="36" width="3" x="72" />
            <rect fill="#0f172a" height="36" width="2" x="77" />
            <rect fill="#0f172a" height="36" width="1" x="81" />
            <rect fill="#0f172a" height="36" width="4" x="84" />
            <rect fill="#0f172a" height="36" width="2" x="90" />
            <rect fill="#0f172a" height="36" width="3" x="94" />
            <rect fill="#0f172a" height="36" width="1" x="99" />
            <rect fill="#0f172a" height="36" width="5" x="102" />
            <rect fill="#0f172a" height="36" width="2" x="109" />
            <rect fill="#0f172a" height="36" width="1" x="113" />
            <rect fill="#0f172a" height="36" width="3" x="116" />
            <rect fill="#0f172a" height="36" width="4" x="121" />
            <rect fill="#0f172a" height="36" width="1" x="127" />
            <rect fill="#0f172a" height="36" width="3" x="130" />
            <rect fill="#0f172a" height="36" width="2" x="135" />
            <rect fill="#0f172a" height="36" width="4" x="139" />
            <rect fill="#0f172a" height="36" width="2" x="145" />
            <rect fill="#0f172a" height="36" width="3" x="149" />
            <rect fill="#0f172a" height="36" width="1" x="154" />
          </svg>
        </div>
        <div className="text-[9px] font-mono tracking-widest text-slate-800 font-bold">
          {barcodeString}
        </div>
      </div>

      {/* Quality & Handover Signature Lines */}
      <div className="pt-2 border-t border-dashed border-slate-400 space-y-2 text-[9px] text-slate-700 font-bold">
        <div className="flex justify-between items-center">
          <span className="uppercase">QC Seal Hologram:</span>
          <span className="font-black text-black">[ VERIFIED ]</span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="border-b border-dotted border-slate-600 pb-1 text-center">
            <span className="block text-[8px] text-slate-600 font-semibold">
              Runner: {runnerName}
            </span>
          </div>
          <div className="border-b border-dotted border-slate-600 pb-1 text-center">
            <span className="block text-[8px] text-slate-600 font-semibold">
              {dispatchInCharge}
            </span>
          </div>
        </div>
        <div className="text-center text-[8px] text-slate-600 pt-1">
          MINSAH SOURCING TERMINAL • DHAKA HUB
        </div>
      </div>
    </>
  );
};
