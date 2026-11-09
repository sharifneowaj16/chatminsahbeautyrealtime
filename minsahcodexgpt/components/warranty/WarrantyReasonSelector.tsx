'use client';

import React from 'react';
import { Syringe, ShieldCheck, Droplet, FlaskConical, CheckCircle2 } from 'lucide-react';
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
    <div className="flex flex-col gap-2.5 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">
          2. What Happened?
        </span>
        <span className="text-xs text-[#828fff] font-mono">
          Select defect
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
                  ? 'bg-[#5e6ad2] text-white border border-[#5e6ad2]'
                  : 'bg-[#0f1011] text-[#8a8f98] border border-[#23252a] hover:bg-[#141516] hover:text-[#f7f8f8]'
              }`}
            >
              <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-[#828fff]'}`}>
                {r.icon}
              </span>
              <span className="text-xs font-semibold flex-1 truncate">
                {r.label}
              </span>
              {isSelected && (
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-1">
        <textarea
          rows={3}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Optional notes: Describe batch code, leak severity, or packaging condition..."
          className="w-full p-3 rounded-xl bg-[#141516] border border-[#23252a] text-xs text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
        />
      </div>
    </div>
  );
}