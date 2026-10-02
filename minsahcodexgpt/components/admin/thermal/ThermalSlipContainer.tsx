'use client';

import React from 'react';

export type ThermalPaperWidth = '80mm' | '76mm' | '58mm';

export interface ThermalSlipContainerProps {
  paperWidth: ThermalPaperWidth;
  children: React.ReactNode;
  className?: string;
}

export const ThermalSlipContainer: React.FC<ThermalSlipContainerProps> = ({
  paperWidth,
  children,
  className = '',
}) => {
  const widthClass =
    paperWidth === '58mm'
      ? 'w-[58mm] max-w-[58mm]'
      : paperWidth === '76mm'
      ? 'w-[76mm] max-w-[76mm]'
      : 'w-[80mm] max-w-[80mm]';

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: ${paperWidth} auto;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-print-area,
          #thermal-print-area * {
            visibility: visible !important;
          }
          #thermal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div
        id="thermal-print-area"
        className={`${widthClass} mx-auto bg-white text-black p-4 font-mono text-xs shadow-2xl rounded-sm border border-slate-300 print:shadow-none print:border-none print:p-1 select-text ${className}`}
      >
        {children}
      </div>
    </>
  );
};

export default ThermalSlipContainer;
