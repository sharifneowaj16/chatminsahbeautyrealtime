'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface ProductFlashSaleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ProductFlashSaleToggle({ checked, onChange }: ProductFlashSaleToggleProps) {
  return (
    <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 rounded-lg border border-[#232636] bg-[#10121b] hover:bg-[#1b1e2c] transition-all w-full">
      <Input
        type="checkbox"
        name="flashSaleEligible"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-white/20 bg-[#161824] text-[#5e6ad2] focus:ring-white/20 cursor-pointer"
      />
      <div className="flex items-center space-x-1.5">
        <Zap className={`w-3.5 h-3.5 ${checked ? 'text-amber-400 fill-amber-400' : 'text-white/40'}`} />
        <span className="text-xs font-medium text-[#d0d6e0]">Flash Sale Eligible</span>
      </div>
    </label>
  );
}
