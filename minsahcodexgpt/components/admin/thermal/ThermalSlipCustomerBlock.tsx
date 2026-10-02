'use client';

import React from 'react';

export interface ThermalSlipCustomerBlockProps {
  customerName: string;
  phone: string;
  address?: string;
  courierPartner?: string;
  courierTracking?: string;
  specialInstructions?: string;
  className?: string;
}

export const ThermalSlipCustomerBlock: React.FC<ThermalSlipCustomerBlockProps> = ({
  customerName,
  phone,
  address,
  courierPartner,
  courierTracking,
  specialInstructions,
  className = '',
}) => {
  return (
    <div className={`py-2 text-[10px] border-b border-dashed border-black space-y-1 ${className}`}>
      <div className="flex justify-between font-bold">
        <span>CUSTOMER:</span>
        <span className="uppercase">{customerName || 'Walk-in / Guest'}</span>
      </div>

      <div className="flex justify-between">
        <span>PHONE:</span>
        <span className="font-bold tracking-wider">{phone || '—'}</span>
      </div>

      {address && (
        <div className="pt-0.5">
          <span className="font-semibold block text-[9px] text-gray-700">DELIVERY ADDRESS:</span>
          <p className="text-[10px] leading-tight whitespace-pre-line">{address}</p>
        </div>
      )}

      {courierPartner && (
        <div className="pt-1 mt-1 border-t border-dotted border-gray-400 flex justify-between font-semibold">
          <span>COURIER:</span>
          <span className="uppercase">{courierPartner}</span>
        </div>
      )}

      {courierTracking && (
        <div className="flex justify-between font-mono font-bold">
          <span>TRACKING NO:</span>
          <span>{courierTracking}</span>
        </div>
      )}

      {specialInstructions && (
        <div className="mt-1 p-1 bg-gray-100 rounded text-[9px] border border-gray-300">
          <span className="font-bold block">SPECIAL INSTRUCTION:</span>
          <p>{specialInstructions}</p>
        </div>
      )}
    </div>
  );
};

export default ThermalSlipCustomerBlock;
