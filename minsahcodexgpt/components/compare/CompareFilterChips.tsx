'use client';

import React from 'react';
import { CompareFilterCategory } from './types';

interface CompareFilterChipsProps {
  activeCategory: CompareFilterCategory;
  onSelect: (cat: CompareFilterCategory) => void;
}

export default function CompareFilterChips({
  activeCategory,
  onSelect,
}: CompareFilterChipsProps) {
  const chips: { id: CompareFilterCategory; label: string }[] = [
    { id: 'all', label: 'All Specs' },
    { id: 'actives', label: 'Key Actives' },
    { id: 'skin', label: 'Skin Match' },
    { id: 'climate', label: 'Dhaka Climate Rating' },
  ];

  return (
    <div className="px-4 pb-2.5 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
      {chips.map((chip) => {
        const isActive = activeCategory === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelect(chip.id)}
            className={`h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs shrink-0 ${
              isActive
                ? 'bg-[#062402] text-white ring-1 ring-[#062402]'
                : 'bg-[#F2F6F0] text-[#1c3a13] hover:bg-[#E8F0E5] border border-[#E2DED8]/70'
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
