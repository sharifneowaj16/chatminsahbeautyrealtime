'use client';

import React from 'react';
import { Banknote, Smartphone } from 'lucide-react';

interface MobilePaymentMethodTabsProps {
  paymentMethod: 'cash' | 'mfs';
  onMethodChange: (method: 'cash' | 'mfs') => void;
}

export const MobilePaymentMethodTabs: React.FC<MobilePaymentMethodTabsProps> = ({
  paymentMethod,
  onMethodChange,
}) => {
  return (
    <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 shadow-sm select-none">
      <span className="text-xs font-bold text-white uppercase tracking-wider">
        Settlement Channel
      </span>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onMethodChange('cash')}
          className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs font-bold transition cursor-pointer ${
            paymentMethod === 'cash'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
              : 'bg-[#051424] text-slate-400 border-[#1c2b3c] hover:border-slate-500'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Physical Cash</span>
        </button>

        <button
          type="button"
          onClick={() => onMethodChange('mfs')}
          className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs font-bold transition cursor-pointer ${
            paymentMethod === 'mfs'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
              : 'bg-[#051424] text-slate-400 border-[#1c2b3c] hover:border-slate-500'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>bKash / Nagad</span>
        </button>
      </div>
    </div>
  );
};
