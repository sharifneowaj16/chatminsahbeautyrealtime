'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';

export interface ProductConditionSelectProps {
  value: 'NEW' | 'USED' | 'REFURBISHED';
  onChange: (value: 'NEW' | 'USED' | 'REFURBISHED') => void;
}

export function ProductConditionSelect({ value, onChange }: ProductConditionSelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
        Product Physical Condition
      </label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as 'NEW' | 'USED' | 'REFURBISHED')}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] text-[#F7F8F8] text-xs rounded-lg focus:ring-1 focus:ring-white/20"
      >
        <option value="NEW">Brand New (Original Factory Sealed)</option>
        <option value="USED">Pre-Owned / Swatched</option>
        <option value="REFURBISHED">Restocked / Open-Box</option>
      </Select>
    </div>
  );
}
