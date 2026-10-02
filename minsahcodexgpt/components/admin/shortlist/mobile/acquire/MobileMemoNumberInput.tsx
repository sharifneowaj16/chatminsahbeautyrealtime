'use client';

import React from 'react';
import { Receipt } from 'lucide-react';

interface MobileMemoNumberInputProps {
  memo: string;
  onMemoChange: (memo: string) => void;
}

export const MobileMemoNumberInput: React.FC<MobileMemoNumberInputProps> = ({
  memo,
  onMemoChange,
}) => {
  return (
    <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2 shadow-sm select-none">
      <div className="flex items-center gap-1.5">
        <Receipt className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Stall Voucher / Memo Number
        </span>
      </div>

      <input
        type="text"
        placeholder="e.g. MEMO-89412 (Optional)"
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-[#051424] border border-[#1c2b3c] text-white font-mono text-xs focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
      />
    </div>
  );
};
