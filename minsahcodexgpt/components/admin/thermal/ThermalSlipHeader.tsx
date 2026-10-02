'use client';

import React from 'react';

export interface ThermalSlipHeaderProps {
  title?: string;
  subtitle?: string;
  orderNumber: string;
  date?: string | Date;
  cashierName?: string;
  runnerCode?: string;
  barcodeValue?: string;
  className?: string;
}

export const ThermalSlipHeader: React.FC<ThermalSlipHeaderProps> = ({
  title = 'MINSAH BEAUTY',
  subtitle = 'Authentic Premium Cosmetics',
  orderNumber,
  date,
  cashierName = 'POS-01 (Admin)',
  runnerCode,
  barcodeValue,
  className = '',
}) => {
  const formattedDate = date
    ? typeof date === 'string'
      ? date
      : new Date(date).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
    : new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const barcodeText = barcodeValue || orderNumber;

  return (
    <div className={`text-center space-y-1.5 pb-2 border-b border-dashed border-black ${className}`}>
      {/* Brand Header */}
      <h2 className="text-base font-extrabold tracking-widest uppercase">{title}</h2>
      <p className="text-[10px] text-gray-700 tracking-wider uppercase">{subtitle}</p>
      <p className="text-[9px] text-gray-600">Shop #204, Genetic Plaza, Dhanmondi 27 • Hotline: +880 9612-888999</p>

      {/* Barcode Simulation */}
      <div className="py-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-0.5 h-8 w-44 mx-auto overflow-hidden">
          {barcodeText.split('').map((char, i) => {
            const code = char.charCodeAt(0);
            const w1 = (code % 3) + 1;
            const w2 = ((code >> 1) % 2) + 1;
            return (
              <React.Fragment key={i}>
                <span className="h-full bg-black inline-block" style={{ width: `${w1}px` }} />
                <span className="h-full bg-white inline-block w-[1px]" />
                <span className="h-full bg-black inline-block" style={{ width: `${w2}px` }} />
                <span className="h-full bg-white inline-block w-[1.5px]" />
              </React.Fragment>
            );
          })}
        </div>
        <span className="text-[9px] font-mono tracking-widest mt-0.5">*{barcodeText}*</span>
      </div>

      {/* Meta grid */}
      <div className="text-[10px] text-left pt-1 border-t border-dotted border-gray-400 space-y-0.5">
        <div className="flex justify-between">
          <span>Order Reference:</span>
          <span className="font-bold">#{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date / Time:</span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Terminal:</span>
          <span>{cashierName}</span>
        </div>
        {runnerCode && (
          <div className="flex justify-between font-bold">
            <span>Market Runner:</span>
            <span>{runnerCode}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThermalSlipHeader;
