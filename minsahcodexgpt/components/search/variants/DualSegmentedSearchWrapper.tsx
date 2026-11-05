'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface SearchWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const CATEGORIES = [
  { label: 'All', query: '' },
  { label: 'Skincare', query: 'Skincare' },
  { label: 'Makeup', query: 'Makeup' },
  { label: 'Serum', query: 'Serum' },
  { label: 'Sunscreen', query: 'Sunscreen' },
];

export const DualSegmentedSearchWrapper: React.FC<SearchWrapperProps> = ({
  children,
  className = '',
}) => {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState('All');

  const handleSelect = (cat: { label: string; query: string }) => {
    setSelectedCat(cat.label);
    if (cat.query) {
      router.push(`/shop?category=${encodeURIComponent(cat.query)}`);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl border border-white/20 dark:border-[#23252a] bg-[#122416]/95 dark:bg-[#0c0d0e] flex items-center shadow-xs overflow-hidden ${className}`}
    >
      {/* Left Segmented Category Pill */}
      <div className="relative pl-3 pr-2 py-1.5 shrink-0 border-r border-white/15 dark:border-[#23252a] flex items-center gap-1 text-[11px] font-bold text-stone-200 dark:text-stone-300">
        <select
          value={selectedCat}
          onChange={(e) => {
            const found = CATEGORIES.find((c) => c.label === e.target.value) || CATEGORIES[0];
            handleSelect(found);
          }}
          className="bg-transparent text-stone-200 dark:text-stone-300 font-bold focus:outline-none cursor-pointer appearance-none pr-3 text-[11px]"
          aria-label="Filter by Category"
        >
          {CATEGORIES.map((c) => (
            <option key={c.label} value={c.label} className="bg-white dark:bg-[#0f1011] text-black dark:text-white">
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-stone-400 absolute right-1 pointer-events-none" />
      </div>

      {/* Main Search Input Area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

export default DualSegmentedSearchWrapper;

