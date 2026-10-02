'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export interface ProductFeaturedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ProductFeaturedToggle({ checked, onChange }: ProductFeaturedToggleProps) {
  return (
    <label className="flex items-center space-x-2.5 cursor-pointer p-2.5 rounded-lg border border-[#232636] bg-[#10121b] hover:bg-[#1b1e2c] transition-all">
      <Input
        type="checkbox"
        name="featured"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-white/20 bg-[#161824] text-[#5e6ad2] focus:ring-white/20 cursor-pointer"
      />
      <div className="flex items-center space-x-1.5">
        <Star className={`w-3.5 h-3.5 ${checked ? 'text-amber-400 fill-amber-400' : 'text-white/40'}`} />
        <span className="text-xs font-medium text-[#d0d6e0]">Featured on Homepage & Recommendations</span>
      </div>
    </label>
  );
}
