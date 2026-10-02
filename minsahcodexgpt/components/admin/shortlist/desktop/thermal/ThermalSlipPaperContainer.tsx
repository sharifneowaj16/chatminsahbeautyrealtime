'use client';

import React from 'react';

interface ThermalSlipPaperContainerProps {
  children: React.ReactNode;
}

export const ThermalSlipPaperContainer: React.FC<ThermalSlipPaperContainerProps> = ({ children }) => {
  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-80mm-slip, #printable-80mm-slip * {
            visibility: visible !important;
          }
          #printable-80mm-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <div
        id="printable-80mm-slip"
        className="w-full max-w-[360px] bg-[#fdfdfc] text-[#0f172a] shadow-2xl rounded-xs p-4 font-mono text-[11px] leading-relaxed relative flex flex-col select-all border border-slate-300"
      >
        {children}
      </div>
    </>
  );
};
