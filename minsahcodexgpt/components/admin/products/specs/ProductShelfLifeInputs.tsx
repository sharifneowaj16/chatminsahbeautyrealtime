'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface ProductShelfLifeInputsProps {
  shelfLife: string;
  expiryDate: string;
  onChangeShelfLife: (val: string) => void;
  onChangeExpiryDate: (val: string) => void;
}

export function ProductShelfLifeInputs({
  shelfLife,
  expiryDate,
  onChangeShelfLife,
  onChangeExpiryDate,
}: ProductShelfLifeInputsProps) {
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Shelf Life Duration
        </label>
        <Input
          type="text"
          value={shelfLife}
          onChange={(e) => onChangeShelfLife(e.target.value)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
          placeholder="e.g. 24 months (12M after opening)"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
          Batch Expiry Date
        </label>
        <Input
          type="date"
          value={expiryDate}
          onChange={(e) => onChangeExpiryDate(e.target.value)}
          className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] focus:ring-1 focus:ring-white/20"
        />
      </div>
    </>
  );
}
