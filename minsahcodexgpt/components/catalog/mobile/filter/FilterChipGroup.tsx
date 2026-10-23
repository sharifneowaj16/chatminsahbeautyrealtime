'use client';

import { Check, X } from 'lucide-react';

interface FilterChip {
  id: string;
  label: string;
  count?: number;
  colorDot?: string;
}

interface FilterChipGroupProps {
  chips: FilterChip[];
  onRemove: (id: string) => void;
}

export function FilterChipGroup({ chips, onRemove }: FilterChipGroupProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <div
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1c3a13] text-white text-[12px] font-bold shadow-xs animate-in fade-in"
        >
          {chip.colorDot ? (
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-xs"
              style={{ backgroundColor: chip.colorDot }}
            />
          ) : (
            <Check className="w-3.5 h-3.5 text-[#D4F6A2]" />
          )}

          <span>{chip.label}</span>

          {chip.count !== undefined && (
            <span className="text-[10px] text-white/70">({chip.count})</span>
          )}

          <button
            type="button"
            onClick={() => onRemove(chip.id)}
            aria-label={`Remove ${chip.label} filter`}
            className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 text-white inline-flex items-center justify-center ml-0.5 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
