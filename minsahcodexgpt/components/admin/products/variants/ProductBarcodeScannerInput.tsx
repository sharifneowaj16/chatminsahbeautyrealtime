'use client';

import React from 'react';
import { Barcode } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface ProductBarcodeScannerInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProductBarcodeScannerInput({
  value,
  onChange,
  error,
}: ProductBarcodeScannerInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-[#d0d6e0] flex items-center gap-1.5">
          <Barcode className="w-3.5 h-3.5 text-white/50" />
          Barcode / UPC / EAN
        </label>
      </div>
      <Input
        type="text"
        name="barcode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 font-mono"
        placeholder="e.g. 8809647153214"
      />
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
