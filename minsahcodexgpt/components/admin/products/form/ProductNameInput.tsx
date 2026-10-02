'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';

export interface ProductNameInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

export function ProductNameInput({
  value,
  onChange,
  error,
  placeholder = 'e.g., Hydrating Face Serum with Hyaluronic Acid',
}: ProductNameInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-[#d0d6e0]">
          Product Name <span className="text-rose-400">*</span>
        </label>
        <span className="text-[11px] text-white/40">{value.length} characters</span>
      </div>
      <Input
        type="text"
        name="name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'w-full px-3.5 py-2 bg-[#10121b] border rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/35 focus:ring-1 focus:ring-white/20 transition-all',
          error ? 'border-rose-500/80 focus:border-rose-500' : 'border-[#232636] focus:border-white/30'
        )}
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
