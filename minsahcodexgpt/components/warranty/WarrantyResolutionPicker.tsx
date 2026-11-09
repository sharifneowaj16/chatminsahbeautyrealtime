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
        <span className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
          3. Resolution
        </span>
        <span className="text-xs text-[#828fff] font-mono">
          Zero Hassle
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {/* Replacement Option */}
        <label
          onClick={() => onSelect('replacement')}
          className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer shadow-sm transition-all ${
            selectedResolution === 'replacement'
              ? 'bg-[#141516] border-2 border-[#5e6ad2]'
              : 'bg-[#0f1011] border border-[#23252a] hover:border-[#5e6ad2]/40'
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
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                selectedResolution === 'replacement'
                  ? 'bg-[#5e6ad2] text-white'
                  : 'border border-[#23252a] text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">
                Free Express Replacement
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30 text-[10px] font-mono uppercase">
                Fastest (24h)
              </span>
            </div>
          </div>
          <span className="text-xs text-[#27a644] font-mono font-semibold">৳0 Swap</span>
        </label>

        {/* Refund Voucher Option */}
        <label
          onClick={() => onSelect('refund')}
          className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer shadow-sm transition-all ${
            selectedResolution === 'refund'
              ? 'bg-[#141516] border-2 border-[#5e6ad2]'
              : 'bg-[#0f1011] border border-[#23252a] hover:border-[#5e6ad2]/40'
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
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                selectedResolution === 'refund'
                  ? 'bg-[#5e6ad2] text-white'
                  : 'border border-[#23252a] text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">
                Instant Store Credit Voucher
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#18191a] text-[#8a8f98] border border-[#23252a] text-[10px] font-mono uppercase">
                Immediate
              </span>
            </div>
          </div>
          <span className="text-xs text-[#828fff] font-mono font-semibold">100% Value</span>
        </label>
      </div>
    </div>
  );
}