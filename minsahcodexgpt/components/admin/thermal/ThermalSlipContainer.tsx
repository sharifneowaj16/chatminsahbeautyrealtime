'use client';

import React from 'react';

export type ThermalPaperWidth = '80mm' | '76mm' | '58mm' | '40x12mm';

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
  const isLabel = paperWidth === '40x12mm';

  const widthClass =
    paperWidth === '40x12mm'
      ? 'w-[40mm] max-w-[40mm]'
      : paperWidth === '58mm'
      ? 'w-[58mm] max-w-[58mm]'
      : paperWidth === '76mm'
      ? 'w-[76mm] max-w-[76mm]'
      : 'w-[80mm] max-w-[80mm]';

  const printPageSize = isLabel ? '40mm 12mm' : `${paperWidth} auto`;
  const printPadding = isLabel ? '0 !important' : '2mm 3mm !important';

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: ${printPageSize};
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
            width: ${paperWidth === '40x12mm' ? '40mm' : paperWidth} !important;
            max-width: ${paperWidth === '40x12mm' ? '40mm' : paperWidth} !important;
            height: ${paperWidth === '40x12mm' ? '12mm' : 'auto'} !important;
            max-height: ${paperWidth === '40x12mm' ? '12mm' : 'none'} !important;
            margin: 0 !important;
            padding: ${printPadding};
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div
        id="thermal-print-area"
        className={`${widthClass} mx-auto bg-white text-black ${
          isLabel ? 'p-0 shadow-none border-none' : 'p-4 shadow-2xl rounded-sm border border-slate-300'
        } font-mono text-xs print:shadow-none print:border-none print:p-0 select-text ${className}`}
      >
        {children}
      </div>
    </>
  );
};

export default ThermalSlipContainer;
