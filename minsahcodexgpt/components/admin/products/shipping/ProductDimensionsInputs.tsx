'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { ShieldAlert } from 'lucide-react';

export interface ProductDimensionsInputsProps {
  shippingWeight: string;
  dimensions: { length: string; width: string; height: string };
  isFragile: boolean;
  onChangeWeight: (val: string) => void;
  onChangeDimension: (dim: 'length' | 'width' | 'height', val: string) => void;
  onToggleFragile: (val: boolean) => void;
}

export function ProductDimensionsInputs({
  shippingWeight,
  dimensions,
  isFragile,
  onChangeWeight,
  onChangeDimension,
  onToggleFragile,
}: ProductDimensionsInputsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Shipping Gross Weight (with box packaging)
          </label>
          <Input
            type="text"
            value={shippingWeight}
            onChange={(e) => onChangeWeight(e.target.value)}
            className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
            placeholder="e.g., 200g or 0.2kg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#d0d6e0] mb-1">
            Parcel Dimensions (L × W × H in cm)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['length', 'width', 'height'] as const).map((dim) => (
              <div key={dim}>
                <Input
                  type="text"
                  value={dimensions[dim] || ''}
                  onChange={(e) => onChangeDimension(dim, e.target.value)}
                  className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] rounded-lg text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20 text-center"
                  placeholder={dim.charAt(0).toUpperCase()}
                />
                <p className="text-[10px] text-white/40 mt-0.5 text-center uppercase">{dim}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center space-x-2.5 p-2.5 rounded-lg border border-[#232636] bg-[#10121b] hover:bg-[#131522] cursor-pointer transition-all w-fit">
        <Input
          type="checkbox"
          checked={isFragile}
          onChange={(e) => onToggleFragile(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-[#161824] text-[#5e6ad2] focus:ring-white/20 cursor-pointer"
        />
        <div className="flex items-center space-x-1.5">
          <ShieldAlert className={`w-3.5 h-3.5 ${isFragile ? 'text-amber-400' : 'text-white/40'}`} />
          <span className="text-xs font-medium text-[#d0d6e0]">
            Fragile Item (Requires bubble wrap & caution stickers)
          </span>
        </div>
      </label>
    </div>
  );
}
