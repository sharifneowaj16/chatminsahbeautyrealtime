'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';

export const POPULAR_ORIGIN_COUNTRIES = [
  'South Korea',
  'United States',
  'United Kingdom',
  'Japan',
  'France',
  'Germany',
  'Canada',
  'Bangladesh',
  'Italy',
  'Australia',
  'China',
  'Thailand',
  'India',
  'Other',
];

export interface ProductOriginCountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  countries?: string[];
}

export function ProductOriginCountrySelect({
  value,
  onChange,
  countries = POPULAR_ORIGIN_COUNTRIES,
}: ProductOriginCountrySelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1">Origin Country</label>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] text-[#F7F8F8] text-xs rounded-lg focus:ring-1 focus:ring-white/20"
      >
        <option value="">Select country</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </div>
  );
}
