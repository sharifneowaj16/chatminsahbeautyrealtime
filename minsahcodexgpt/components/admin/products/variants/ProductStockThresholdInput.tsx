'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface ProductStockThresholdInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProductStockThresholdInput({
  value,
  onChange,
  error,
}: ProductStockThresholdInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        Low Stock Alert Threshold
      </label>
      <Input
        type="number"
        min="0"
        name="lowStockThreshold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
        placeholder="10"
      />
      <p className="text-[10px] text-white/40 mt-1">
        Triggers low-stock warning chips and notifications when stock falls below this number.
      </p>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
