'use client';

import React from 'react';
import { Sliders, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface MobileUnitCostNegotiatorProps {
  unitCost: number;
  baseCost: number;
  retailUnitPrice: number;
  onUnitCostChange: (cost: number) => void;
}

export const MobileUnitCostNegotiator: React.FC<MobileUnitCostNegotiatorProps> = ({
  unitCost,
  baseCost,
  retailUnitPrice,
  onUnitCostChange,
}) => {
  const marginPerUnit = retailUnitPrice - unitCost;
  const marginPercent = retailUnitPrice > 0 ? Math.round((marginPerUnit / retailUnitPrice) * 100) : 0;

  const priceChips = [
    { label: `-৳50`, diff: -50, price: Math.max(10, baseCost - 50) },
    { label: `-৳20`, diff: -20, price: Math.max(10, baseCost - 20) },
    { label: `Std ৳${baseCost}`, diff: 0, price: baseCost },
    { label: `+৳20`, diff: 20, price: baseCost + 20 },
    { label: `+৳50`, diff: 50, price: baseCost + 50 },
  ];

  return (
    <div className="p-3 rounded-2xl bg-[#122131] border border-[#1f2f45] flex flex-col gap-2.5 shadow-sm select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Unit Cost &amp; Price Negotiation
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className={marginPercent >= 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            +{marginPercent}% Margin
          </span>
        </div>
      </div>

      {/* Price Input & Financial Delta */}
      <div className="flex items-center gap-3 bg-[#051424] p-2.5 rounded-xl border border-[#1c2b3c]">
        <div className="flex-1">
          <label className="text-[10px] text-slate-400 uppercase font-mono block">
            Negotiated Wholesale (BDT)
          </label>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-emerald-400 font-mono">৳</span>
            <input
              type="number"
              value={unitCost}
              onChange={(e) => onUnitCostChange(Math.max(0, Number(e.target.value) || 0))}
              className="w-full bg-transparent text-2xl font-black text-white font-mono focus:outline-none"
            />
          </div>
        </div>

        <div className="text-right border-l border-[#1c2b3c] pl-3 font-mono text-xs">
          <span className="text-[10px] text-slate-400 block">Retail Est.</span>
          <span className="text-slate-300 font-bold">{formatPrice(retailUnitPrice)}</span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">
            Profit: +৳{marginPerUnit}/pc
          </span>
        </div>
      </div>

      {/* Quick Deviation Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 font-mono text-xs">
        {priceChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onUnitCostChange(chip.price)}
            className={`px-2.5 py-1 rounded-md border text-center whitespace-nowrap transition cursor-pointer ${
              unitCost === chip.price
                ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                : 'bg-[#091726] text-slate-300 border-[#192f48] hover:border-slate-500'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
