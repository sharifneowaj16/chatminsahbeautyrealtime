'use client';

import React from 'react';
import { MapPin, Phone } from 'lucide-react';

interface WalkingRouteStepHeaderProps {
  stepIndex: number;
  marketName: string;
  unitsInStep: number;
  vendorName: string;
  stallAddress: string;
  phone: string;
  contactName: string;
}

export const WalkingRouteStepHeader: React.FC<WalkingRouteStepHeaderProps> = ({
  stepIndex,
  marketName,
  unitsInStep,
  vendorName,
  stallAddress,
  phone,
  contactName,
}) => {
  return (
    <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-[#142337] font-mono text-xs select-none">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
            {stepIndex}
          </span>
          <span className="font-bold text-white uppercase">{marketName}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
            {unitsInStep} pcs
          </span>
        </div>
        <div className="text-slate-300 font-semibold text-xs mt-1">
          {vendorName}
        </div>
        <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
          <MapPin className="w-2.5 h-2.5 shrink-0" />
          <span>{stallAddress}</span>
        </div>
      </div>

      <div className="text-right">
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b1b2d] border border-[#173050] text-indigo-300 hover:text-white text-[10px] transition-colors"
        >
          <Phone className="w-2.5 h-2.5 shrink-0" />
          <span>{phone}</span>
        </a>
        <span className="block text-slate-500 text-[9px] mt-0.5">
          {contactName}
        </span>
      </div>
    </div>
  );
};
