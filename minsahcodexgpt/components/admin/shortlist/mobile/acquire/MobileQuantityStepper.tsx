'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface MobileQuantityStepperProps {
  acquireQty: number;
  remainingQty: number;
  onQtyChange: (qty: number) => void;
}

export const MobileQuantityStepper: React.FC<MobileQuantityStepperProps> = ({
  acquireQty,
  remainingQty,
  onQtyChange,
}) => {
  const remainingAfter = Math.max(0, remainingQty - acquireQty);

  return (
    <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 shadow-sm select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="text-xs font-bold font-mono">#</span>
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Acquisition Quantity
          </span>
        </div>
        <span className="text-xs font-mono text-emerald-400 font-semibold">
          Remaining after this: {remainingAfter} pcs
        </span>
      </div>

      {/* Stepper Display */}
      <div className="flex items-center justify-between gap-3 bg-[#051424] p-2 rounded-xl border border-[#1c2b3c]">
        <button
          type="button"
          onClick={() => onQtyChange(Math.max(1, acquireQty - 1))}
          className="w-11 h-11 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] active:scale-95 text-white flex items-center justify-center shrink-0 transition cursor-pointer"
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-white font-mono">{acquireQty}</span>
          <span className="text-xs text-slate-400 uppercase font-semibold">Pieces</span>
        </div>
        <button
          type="button"
          onClick={() => onQtyChange(acquireQty + 1)}
          className="w-11 h-11 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] active:scale-95 text-white flex items-center justify-center shrink-0 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Select Preset Buttons */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => onQtyChange(1)}
          className={`flex-1 py-1 rounded-md border text-center transition cursor-pointer ${
            acquireQty === 1
              ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
              : 'bg-[#0a1828] text-slate-400 border-[#1a2d42]'
          }`}
        >
          1 pc
        </button>

        {remainingQty > 2 && (
          <button
            type="button"
            onClick={() => onQtyChange(Math.ceil(remainingQty / 2))}
            className="flex-1 py-1 rounded-md border bg-[#0a1828] text-slate-400 border-[#1a2d42] text-center transition cursor-pointer"
          >
            Half ({Math.ceil(remainingQty / 2)})
          </button>
        )}

        <button
          type="button"
          onClick={() => onQtyChange(remainingQty)}
          className={`flex-1 py-1 rounded-md border text-center transition cursor-pointer ${
            acquireQty === remainingQty
              ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
              : 'bg-[#0a1828] text-slate-400 border-[#1a2d42]'
          }`}
        >
          All ({remainingQty})
        </button>
      </div>
    </div>
  );
};
