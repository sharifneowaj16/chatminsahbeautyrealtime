'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';

export interface ProductTableHeaderProps {
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  hasProducts?: boolean;
}

export function ProductTableHeader({
  allSelected,
  onSelectAll,
  hasProducts = true,
}: ProductTableHeaderProps) {
  return (
    <thead className="bg-[#10121b] border-b border-[#232636]">
      <tr>
        <th className="px-3.5 py-2 text-left w-10">
          <Input
            type="checkbox"
            checked={allSelected && hasProducts}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="rounded border-white/[0.15] bg-[#10121b] text-white focus:ring-white/20 w-3.5 h-3.5 cursor-pointer"
          />
        </th>
        <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Product
        </th>
        <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Category
        </th>
        <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Price
        </th>
        <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Stock
        </th>
        <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Status
        </th>
        <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Rating
        </th>
        <th className="px-3 py-2 text-right text-[11px] font-medium text-white/50 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );
}
