'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { WarrantyResolutionType } from './types';

interface WarrantyResolutionPickerProps {
  selectedResolution: WarrantyResolutionType;
  onSelect: (type: WarrantyResolutionType) => void;
}

export default function WarrantyResolutionPicker({
  selectedResolution,
  onSelect,
}: WarrantyResolutionPickerProps) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[#062402] uppercase tracking-wider">
          3. Resolution
        </span>
        <span className="text-[11px] text-[#4b6723] font-bold">
          Zero Hassle
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {/* Replacement Option */}
        <label
          onClick={() => onSelect('replacement')}
          className={`p-3 rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all ${
            selectedResolution === 'replacement'
              ? 'bg-[#E8F0E5] border-2 border-[#062402]'
              : 'bg-[#F8FAF7] border border-[#E2DED8]/60 hover:bg-[#efeeeb]'
          }`}
        >
          <input
            type="radio"
            name="claim_resolution"
            value="replacement"
            checked={selectedResolution === 'replacement'}
            onChange={() => onSelect('replacement')}
            className="sr-only"
          />
          <div className="flex items-center gap-2.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                selectedResolution === 'replacement'
                  ? 'bg-[#062402] text-white'
                  : 'bg-[#e3e2e0] text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[#062402]">
                Free Express Replacement
              </span>
              <span className="px-2 py-0.2 rounded-full bg-[#062402] text-[#D4F6A2] text-[9px] font-bold uppercase">
                Fastest (24h)
              </span>
            </div>
          </div>
        </label>

        {/* Refund Option */}
        <label
          onClick={() => onSelect('refund')}
          className={`p-3 rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all ${
            selectedResolution === 'refund'
              ? 'bg-[#E8F0E5] border-2 border-[#062402]'
              : 'bg-[#F8FAF7] border border-[#E2DED8]/60 hover:bg-[#efeeeb]'
          }`}
        >
          <input
            type="radio"
            name="claim_resolution"
            value="refund"
            checked={selectedResolution === 'refund'}
            onChange={() => onSelect('refund')}
            className="sr-only"
          />
          <div className="flex items-center gap-2.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                selectedResolution === 'refund'
                  ? 'bg-[#062402] text-white'
                  : 'bg-[#e3e2e0] text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[#062402]">
                100% Instant Refund
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#efeeeb] text-[#43483f] text-[9px] font-medium">
                bKash / Card
              </span>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
