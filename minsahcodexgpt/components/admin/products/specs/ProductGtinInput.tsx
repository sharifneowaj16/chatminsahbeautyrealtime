'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface ProductGtinInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProductGtinInput({ value, onChange, error }: ProductGtinInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
        GTIN / Global Trade Item Number
      </label>
      <Input
        type="text"
        name="gtin"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono"
        placeholder="1234567890123"
      />
      <p className="text-[10px] text-white/40 mt-1">
        Required for Google Merchant Center and structured rich snippets.
      </p>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
