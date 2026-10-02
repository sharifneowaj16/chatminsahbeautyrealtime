// components/admin/shortlist/mobile/feed/MobileFloatBudgetCard.tsx
'use client';

import React from 'react';
import { Wallet, ShoppingBag, Store } from 'lucide-react';

export interface MobileFloatBudgetCardProps {
  runnerBudget: number;
  spentAmount: number;
  currency?: string;
  totalQuantity?: number;
  totalSkus?: number;
  hubCount?: number;
  primaryHub?: string;
}

export const MobileFloatBudgetCard: React.FC<MobileFloatBudgetCardProps> = ({
  runnerBudget,
  spentAmount,
  currency = '৳',
  totalQuantity,
  totalSkus,
  hubCount = 3,
  primaryHub = 'Paltan #1',
}) => {
  const remaining = Math.max(0, runnerBudget - spentAmount);
  const percentSpent = runnerBudget > 0 ? Math.min(100, Math.round((spentAmount / runnerBudget) * 100)) : 0;

  if (totalQuantity !== undefined && totalSkus !== undefined) {
    return (
      <div className="grid grid-cols-3 gap-2 select-none">
        {/* KPI 1: To Procure */}
        <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-semibold truncate">
              To Procure
            </span>
            <ShoppingBag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base text-white font-bold font-mono">{totalQuantity}</span>
            <span className="text-[10px] text-slate-400 font-medium">pcs</span>
          </div>
          <span className="text-[10px] text-indigo-400 font-mono truncate mt-0.5">
            {totalSkus} SKUs total
          </span>
        </div>

        {/* KPI 2: Cash Float */}
        <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-semibold truncate">
              Cash Float
            </span>
            <Wallet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base text-emerald-400 font-bold font-mono">
              ৳{remaining.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
            ৳{spentAmount.toLocaleString()} spent
          </span>
        </div>

        {/* KPI 3: Markets */}
        <div className="p-2.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col justify-between shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-semibold truncate">
              Markets
            </span>
            <Store className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base text-white font-bold font-mono">{hubCount} hubs</span>
          </div>
          <span className="text-[10px] text-amber-300 font-mono truncate mt-0.5">
            {primaryHub}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-br from-[#0c1c2e] to-[#071322] border border-[#1b314b] shadow-md select-none">
      <div className="flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">Runner Float Ledger</span>
        </div>
        <span className="text-emerald-400 font-bold">
          {percentSpent}% Spent
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-1.5 bg-[#06121f] rounded-lg border border-[#142337]">
          <span className="text-[10px] text-slate-400 block">Allocated</span>
          <span className="text-xs font-bold text-white">{currency}{runnerBudget.toLocaleString()}</span>
        </div>
        <div className="p-1.5 bg-[#06121f] rounded-lg border border-[#142337]">
          <span className="text-[10px] text-slate-400 block">Spent</span>
          <span className="text-xs font-bold text-amber-400">{currency}{spentAmount.toLocaleString()}</span>
        </div>
        <div className="p-1.5 bg-[#06121f] rounded-lg border border-[#142337]">
          <span className="text-[10px] text-slate-400 block">Remaining</span>
          <span className="text-xs font-bold text-emerald-400">{currency}{remaining.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
export default MobileFloatBudgetCard;
