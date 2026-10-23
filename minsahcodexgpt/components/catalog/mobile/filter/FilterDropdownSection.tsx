'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FilterOption } from './types';
import { FilterChipGroup } from './FilterChipGroup';

interface FilterDropdownSectionProps {
  title: string;
  icon?: React.ReactNode;
  options: FilterOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  dropdownPlaceholder: string;
}

export function FilterDropdownSection({
  title,
  icon,
  options,
  selectedIds,
  onToggle,
  dropdownPlaceholder,
}: FilterDropdownSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));
  const remainingCount = options.length - selectedIds.length;

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Title & Count Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#062402] uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {selectedIds.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold">
            {selectedIds.length} Active
          </span>
        )}
      </div>

      {/* Selected Chips */}
      <FilterChipGroup
        chips={selectedOptions.map((opt) => ({
          id: opt.id,
          label: opt.label,
          count: opt.count,
          colorDot: opt.colorHex,
        }))}
        onRemove={onToggle}
      />

      {/* Dropdown Toggle Button */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#f4f3f1] border border-[#E2DED8]/60 hover:bg-[#E8F0E5] transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#1a1c1a] font-semibold">
              {dropdownPlaceholder}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {remainingCount > 0 && (
              <span className="text-[11px] text-[#43483f]/70 font-medium">
                {remainingCount} more
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#43483f] transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Dropdown Panel */}
        {isOpen && (
          <div className="mt-1.5 w-full bg-white rounded-2xl p-1.5 border border-[#E2DED8]/70 shadow-md flex flex-col gap-1 max-h-56 overflow-y-auto z-10 animate-in fade-in slide-in-from-top-1">
            {options.map((opt) => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onToggle(opt.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-[#EAF7D8] text-[#1c3a13] font-semibold'
                      : 'hover:bg-[#f4f3f1] text-[#1a1c1a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.colorHex && (
                      <span
                        className="w-3 h-3 rounded-full border border-[#E2DED8]/60"
                        style={{ backgroundColor: opt.colorHex }}
                      />
                    )}
                    <span className="text-[12px]">{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#43483f]/70">
                      ({opt.count})
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#4b6723]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
