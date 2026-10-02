'use client';

import React from 'react';
import { clsx } from 'clsx';

export const DEFAULT_SKIN_TYPES = [
  'All Skin Types',
  'Oily',
  'Dry',
  'Combination',
  'Sensitive',
  'Normal',
  'Acne-Prone',
];

export interface ProductSkinTypePillsProps {
  selected: string[];
  onToggle: (skinType: string) => void;
  availableTypes?: string[];
}

export function ProductSkinTypePills({
  selected,
  onToggle,
  availableTypes = DEFAULT_SKIN_TYPES,
}: ProductSkinTypePillsProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-2">
        Suitable Skin Type Compatibility
      </label>
      <div className="flex flex-wrap gap-2">
        {availableTypes.map((type) => {
          const isSelected = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              className={clsx(
                'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.97]',
                isSelected
                  ? 'bg-[#5e6ad2] text-white border-[#5e6ad2] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'bg-[#10121b] border-[#232636] text-white/60 hover:text-white hover:bg-[#1b1e2c]'
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
