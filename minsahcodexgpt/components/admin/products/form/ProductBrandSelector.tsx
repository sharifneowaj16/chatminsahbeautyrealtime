'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';

export const DEFAULT_POPULAR_BRANDS = [
  'COSRX',
  'Beauty of Joseon',
  'The Ordinary',
  'CeraVe',
  'La Roche-Posay',
  'Laneige',
  'Anua',
  'Innisfree',
  'Some By Mi',
  'Centella / SKIN1004',
  'Rhode',
  'Fenty Beauty',
];

export interface ProductBrandSelectorProps {
  value: string;
  onChange: (value: string) => void;
  brands?: string[];
  error?: string;
}

export function ProductBrandSelector({
  value,
  onChange,
  brands = DEFAULT_POPULAR_BRANDS,
  error,
}: ProductBrandSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
        Brand <span className="text-rose-400">*</span>
      </label>
      <Input
        type="text"
        name="brand"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="brand-datalist"
        className={clsx(
          'w-full px-3 py-2 bg-[#10121b] border rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/35 focus:ring-1 focus:ring-white/20',
          error ? 'border-rose-500/80' : 'border-[#232636]'
        )}
        placeholder="Select or type brand"
      />
      <datalist id="brand-datalist">
        {brands.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
