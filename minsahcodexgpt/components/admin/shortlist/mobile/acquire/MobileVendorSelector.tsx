'use client';

import React from 'react';
import { Store, Check } from 'lucide-react';

export interface SourcingSupplierOption {
  id: string;
  name: string;
  location: string;
  phone: string;
  tag: string;
  status: string;
  statusColor: string;
}

interface MobileVendorSelectorProps {
  options: SourcingSupplierOption[];
  selectedSupplier: string;
  onSelectSupplier: (supplierName: string) => void;
  onToggleCustomStall: () => void;
  showCustomStall: boolean;
}

export const MobileVendorSelector: React.FC<MobileVendorSelectorProps> = ({
  options,
  selectedSupplier,
  onSelectSupplier,
  onToggleCustomStall,
  showCustomStall,
}) => {
  return (
    <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 shadow-sm select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Store className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Wholesale Merchant Stall
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCustomStall}
          className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
        >
          {showCustomStall ? 'Choose Saved Stall' : '+ Custom Stall'}
        </button>
      </div>

      {!showCustomStall && (
        <div className="flex flex-col gap-1.5">
          {options.map((opt) => {
            const isMatch = selectedSupplier.includes(opt.name);
            return (
              <div
                key={opt.id}
                onClick={() => onSelectSupplier(`${opt.name} (${opt.location})`)}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                  isMatch
                    ? 'bg-[#0a1e33] border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : 'bg-[#051424] border-[#1c2b3c] hover:border-[#273d57]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {opt.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono font-semibold">
                      {opt.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                    📍 {opt.location}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-mono font-bold ${opt.statusColor}`}>
                    {opt.status}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isMatch ? 'bg-indigo-600 text-white' : 'border border-slate-600'
                    }`}
                  >
                    {isMatch && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
