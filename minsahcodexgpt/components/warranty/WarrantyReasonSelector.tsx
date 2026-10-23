'use client';

import React from 'react';
import { Syringe, ShieldCheck, Droplet, FlaskConical, CheckCircle2, Circle } from 'lucide-react';
import { WarrantyReasonId } from './types';

interface WarrantyReasonSelectorProps {
  selectedReason: WarrantyReasonId;
  onSelectReason: (r: WarrantyReasonId) => void;
  note: string;
  onNoteChange: (val: string) => void;
}

export default function WarrantyReasonSelector({
  selectedReason,
  onSelectReason,
  note,
  onNoteChange,
}: WarrantyReasonSelectorProps) {
  const reasons: { id: WarrantyReasonId; label: string; icon: React.ReactNode }[] = [
    { id: 'broken_dropper', label: 'Broken Dropper', icon: <Syringe className="w-4 h-4" /> },
    { id: 'damaged_seal', label: 'Damaged Seal', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'leakage', label: 'Leakage in Box', icon: <Droplet className="w-4 h-4" /> },
    { id: 'formula_issue', label: 'Formula Issue', icon: <FlaskConical className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[#062402] uppercase tracking-wider">
          2. What Happened?
        </span>
        <span className="text-[11px] text-[#4b6723] font-bold">
          Select one
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {reasons.map((r) => {
          const isSelected = selectedReason === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectReason(r.id)}
              className={`p-3 rounded-xl flex items-center gap-2.5 text-left active:scale-[0.98] transition-all cursor-pointer shadow-sm ${
                isSelected
                  ? 'bg-[#062402] text-white'
                  : 'bg-[#F8FAF7] text-[#1a1c1a] border border-[#E2DED8]/60 hover:bg-[#efeeeb]'
              }`}
            >
              <span className={`shrink-0 ${isSelected ? 'text-[#D4F6A2]' : 'text-[#4b6723]'}`}>
                {r.icon}
              </span>
              <span className="text-xs font-bold flex-1 truncate">
                {r.label}
              </span>
              {isSelected ? (
                <CheckCircle2 className="w-4 h-4 text-[#D4F6A2] shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-[#B5C4BB] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Note Input */}
      <div className="flex flex-col gap-1.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-[#062402] uppercase tracking-wider">
            Product Issue <span className="text-[11px] font-normal text-[#43483f] lowercase">(optional)</span>
          </label>
          <span className="text-[10px] text-[#43483f] font-medium">
            Max 200 chars
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          maxLength={200}
          placeholder="Describe the specific issue with the product (e.g. broken dropper, leaking seal)..."
          className="w-full p-3 rounded-2xl bg-[#efeeeb] border border-[#E2DED8]/60 text-xs text-[#1a1c1a] placeholder:text-[#43483f]/70 focus:outline-none focus:border-[#4b6723] focus:ring-1 focus:ring-[#4b6723] transition-all min-h-[72px] resize-none"
        />
      </div>
    </div>
  );
}
