// components/admin/shortlist/mobile/acquire/MobileQualityChecklist.tsx
'use client';

import React from 'react';
import { Check } from 'lucide-react';

export interface MobileQualityChecklistProps {
  isHologramVerified?: boolean;
  isExpiryVerified?: boolean;
  hologramVerified?: boolean;
  expiryVerified?: boolean;
  onToggleHologram: () => void;
  onToggleExpiry: () => void;
}

export const MobileQualityChecklist: React.FC<MobileQualityChecklistProps> = ({
  isHologramVerified,
  isExpiryVerified,
  hologramVerified,
  expiryVerified,
  onToggleHologram,
  onToggleExpiry,
}) => {
  const verifiedHologram = isHologramVerified ?? hologramVerified ?? true;
  const verifiedExpiry = isExpiryVerified ?? expiryVerified ?? true;

  return (
    <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2 shadow-sm select-none">
      <span className="text-xs font-bold text-white uppercase tracking-wider">
        QC Inward Verification
      </span>

      <div className="flex flex-col gap-1.5 font-mono text-xs">
        <div
          onClick={onToggleHologram}
          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
            verifiedHologram
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-[#051424] border-[#1c2b3c] text-slate-400 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                verifiedHologram
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-[#1c2b3c] text-slate-500'
              }`}
            >
              {verifiedHologram && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
            <span className="text-white font-semibold">100% Brand Hologram Seal</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {verifiedHologram ? 'Verified ✓' : 'Unchecked'}
          </span>
        </div>

        <div
          onClick={onToggleExpiry}
          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
            verifiedExpiry
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-[#051424] border-[#1c2b3c] text-slate-400 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                verifiedExpiry
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-[#1c2b3c] text-slate-500'
              }`}
            >
              {verifiedExpiry && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
            <span className="text-white font-semibold">&gt; 12 Months Expiry Window</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {verifiedExpiry ? 'Pass ✓' : 'Unchecked'}
          </span>
        </div>
      </div>
    </div>
  );
};
export default MobileQualityChecklist;
