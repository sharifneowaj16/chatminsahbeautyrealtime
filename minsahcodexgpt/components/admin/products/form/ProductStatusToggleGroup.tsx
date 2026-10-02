'use client';

import React from 'react';
import { clsx } from 'clsx';
import { ApiProduct } from '../types';

export interface ProductStatusToggleGroupProps {
  value: ApiProduct['status'];
  onChange: (status: ApiProduct['status']) => void;
}

export function ProductStatusToggleGroup({
  value,
  onChange,
}: ProductStatusToggleGroupProps) {
  const options: Array<{ id: ApiProduct['status']; label: string; activeClass: string }> = [
    {
      id: 'active',
      label: 'Active',
      activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'inactive',
      label: 'Inactive',
      activeClass: 'bg-white/[0.12] text-white/90 border-white/20',
    },
    {
      id: 'out_of_stock',
      label: 'Out of Stock',
      activeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
  ];

  return (
    <div>
      <label className="block text-xs font-medium text-[#d0d6e0] mb-1.5">
        Catalogue Status <span className="text-rose-400">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={clsx(
              'h-8.5 px-3 rounded-lg text-xs font-medium border transition-all active:scale-[0.98] text-center',
              value === opt.id
                ? opt.activeClass
                : 'bg-[#10121b] border-[#232636] text-white/50 hover:text-white/80 hover:bg-[#1b1e2c]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
