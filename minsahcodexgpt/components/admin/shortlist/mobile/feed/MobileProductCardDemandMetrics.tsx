'use client';

import React from 'react';
import { formatPrice } from '@/utils/currency';

interface MobileProductCardDemandMetricsProps {
  requiredQuantity: number;
  pickedQuantity: number;
  unitCost: number;
  totalCost: number;
}

export const MobileProductCardDemandMetrics: React.FC<MobileProductCardDemandMetricsProps> = ({
  requiredQuantity,
  pickedQuantity,
  unitCost,
  totalCost,
}) => {
  const percent = requiredQuantity > 0 ? Math.min(100, Math.round((pickedQuantity / requiredQuantity) * 100)) : 0;
  const isComplete = pickedQuantity >= requiredQuantity;

  return (
    <div className="mt-1 text-[11px] font-mono select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Demand:</span>
          <span className="font-bold text-amber-300">{requiredQuantity} pcs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Est. Float:</span>
          <span className="font-bold text-emerald-400">{formatPrice(totalCost)}</span>
        </div>
      </div>

      <div className="w-full bg-[#0a1523] h-1.5 rounded-full overflow-hidden border border-[#172b40] mt-1.5">
        <div
          className={`h-full transition-all duration-300 ${
            isComplete ? 'bg-emerald-400' : 'bg-indigo-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
