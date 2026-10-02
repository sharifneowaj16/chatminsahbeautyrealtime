'use client';

import React from 'react';
import { Wallet, Check, AlertCircle } from 'lucide-react';

interface RunnerFloatDiscrepancyCardProps {
  runnerName: string;
  runnerCode: string;
  cashGiven: number;
  actualSpent: number;
  cashReturned: number;
  previousDue: number;
  onCashGivenChange: (val: number) => void;
  onActualSpentChange: (val: number) => void;
  onCashReturnedChange: (val: number) => void;
  onSettleRunnerCash: () => void;
  onDayEndBatchSettle: () => void;
  reconciling: boolean;
  dayEndSettling: boolean;
  reconcileMsg: string | null;
}

export const RunnerFloatDiscrepancyCard: React.FC<RunnerFloatDiscrepancyCardProps> = ({
  runnerName,
  runnerCode,
  cashGiven,
  actualSpent,
  cashReturned,
  previousDue,
  onCashGivenChange,
  onActualSpentChange,
  onCashReturnedChange,
  onSettleRunnerCash,
  onDayEndBatchSettle,
  reconciling,
  dayEndSettling,
  reconcileMsg,
}) => {
  const discrepancy = Number((cashGiven - (actualSpent + cashReturned)).toFixed(2));
  const effectiveBudget = Math.max(0, Number((cashGiven - previousDue).toFixed(2)));

  return (
    <div className="mx-4 my-3 p-3 rounded-lg bg-[#070e1b] border border-[#1b273d] font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-[#141f33]">
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-white">
            Runner Ledger: {runnerName} ({runnerCode})
          </span>
        </div>
        {previousDue > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
            Due: ৳{previousDue}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2.5">
        <div>
          <span className="text-[10px] text-slate-400 block">Float Given</span>
          <input
            type="number"
            value={cashGiven}
            onChange={(e) => onCashGivenChange(Number(e.target.value) || 0)}
            className="w-full mt-0.5 px-2 py-1 rounded bg-[#030710] border border-[#1b273d] text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">Spent</span>
          <input
            type="number"
            value={actualSpent}
            onChange={(e) => onActualSpentChange(Number(e.target.value) || 0)}
            className="w-full mt-0.5 px-2 py-1 rounded bg-[#030710] border border-[#1b273d] text-amber-400 font-bold text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">Returned</span>
          <input
            type="number"
            value={cashReturned}
            onChange={(e) => onCashReturnedChange(Number(e.target.value) || 0)}
            className="w-full mt-0.5 px-2 py-1 rounded bg-[#030710] border border-[#1b273d] text-emerald-400 font-bold text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#141f33] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Balance Delta:</span>
          <span
            className={`font-bold ${
              discrepancy === 0
                ? 'text-emerald-400'
                : discrepancy > 0
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {discrepancy === 0 ? '✓ Balanced (৳0)' : `৳${discrepancy}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSettleRunnerCash}
            disabled={reconciling}
            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
          >
            {reconciling ? 'Saving...' : 'Reconcile'}
          </button>
          <button
            type="button"
            onClick={onDayEndBatchSettle}
            disabled={dayEndSettling}
            className="px-2 py-1 rounded bg-[#102238] hover:bg-[#183152] border border-[#1e3d64] text-slate-300 hover:text-white text-[10px] font-bold transition-colors disabled:opacity-40 cursor-pointer"
          >
            {dayEndSettling ? 'Closing...' : 'Day-End'}
          </button>
        </div>
      </div>

      {reconcileMsg && (
        <div className="mt-2 p-1.5 rounded bg-[#040812] border border-[#142337] text-[10px] text-slate-300">
          {reconcileMsg}
        </div>
      )}
    </div>
  );
};
