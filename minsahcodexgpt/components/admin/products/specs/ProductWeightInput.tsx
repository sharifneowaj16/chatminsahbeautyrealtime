'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface ProductWeightInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function ProductWeightInput({
  value,
  onChange,
  error,
  placeholder = 'e.g. 50ml or 100g',
}: ProductWeightInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
        Net Weight / Volume
      </label>
      <Input
        type="text"
        name="weight"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
