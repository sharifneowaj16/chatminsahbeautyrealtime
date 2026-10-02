'use client';

import React from 'react';
import { WalkingRouteStep } from '@/app/admin/shortlist/types';
import { Check, Plus, Minus } from 'lucide-react';

interface WalkingRouteItemCardProps {
  step: WalkingRouteStep;
  stepIndex: number;
  onAdjustPrice: (stepIdx: number, delta: number) => void;
  onIncrementPicked: (stepIdx: number) => void;
}

export const WalkingRouteItemCard: React.FC<WalkingRouteItemCardProps> = ({
  step,
  stepIndex,
  onAdjustPrice,
  onIncrementPicked,
}) => {
  const isComplete = step.unitsPicked >= step.totalUnitsRequired;
  const unitRetail = step.retailPrice || Math.round(step.unitCost * 1.4);
  const marginPct = unitRetail > 0 ? Math.round(((unitRetail - step.unitCost) / unitRetail) * 100) : 0;

  return (
    <div
      className={`p-2.5 rounded-lg border transition-all font-mono text-xs ${
        isComplete
          ? 'bg-[#040f1a]/60 border-emerald-800/50'
          : 'bg-[#071322] border-[#18293d]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white truncate text-xs">
              {step.itemTitle}
            </span>
            <span className="px-1 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] uppercase">
              {step.variantOrShade}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <span className="text-indigo-400 font-semibold">{step.skuCode}</span>
            <span>•</span>
            <span>{step.volumeSpec}</span>
          </div>

          {/* Allocated Orders */}
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {step.orderAllocations.map((alloc, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-[#030914] border border-[#142337] text-[9px] text-slate-300"
              >
                {alloc.orderNumber} ({alloc.quantity}x)
              </span>
            ))}
          </div>
        </div>

        {/* Units Picked Counter */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-xs">
            <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-white font-bold'}>
              {step.unitsPicked}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400 font-bold">{step.totalUnitsRequired} pcs</span>
          </div>

          <button
            type="button"
            onClick={() => onIncrementPicked(stepIndex)}
            disabled={isComplete}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isComplete
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Check className="w-2.5 h-2.5" />
            <span>{isComplete ? 'Picked' : '+1 Pick'}</span>
          </button>
        </div>
      </div>

      {/* Pricing Adjuster */}
      <div className="mt-2 pt-2 border-t border-[#122134] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Unit Buy:</span>
          <span className="font-bold text-white">৳{step.unitCost}</span>
          <span className="text-emerald-400 text-[9px]">({marginPct}% margin)</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAdjustPrice(stepIndex, -5)}
            className="w-5 h-5 rounded bg-[#0b1726] border border-[#172c44] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Decrease ৳5"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onAdjustPrice(stepIndex, 5)}
            className="w-5 h-5 rounded bg-[#0b1726] border border-[#172c44] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Increase ৳5"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
