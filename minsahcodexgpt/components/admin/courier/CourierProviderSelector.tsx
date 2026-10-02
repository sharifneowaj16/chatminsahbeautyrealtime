'use client';

import React from 'react';
import { Truck, CheckCircle2, Wallet, Zap } from 'lucide-react';

export type CourierProvider = 'steadfast' | 'pathao';

export interface CourierProviderSelectorProps {
  selected: CourierProvider;
  onSelect: (provider: CourierProvider) => void;
  steadfastBalance?: number | null;
  pathaoAvailable?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CourierProviderSelector: React.FC<CourierProviderSelectorProps> = ({
  selected,
  onSelect,
  steadfastBalance,
  pathaoAvailable = true,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-rose-400" />
          Select Delivery Courier Partner
        </span>
        <span className="text-[10px] text-slate-500 font-normal">Automated API dispatch</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Steadfast Courier Card */}
        <div
          onClick={() => !disabled && onSelect('steadfast')}
          className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
            selected === 'steadfast'
              ? 'bg-rose-950/20 border-rose-500 shadow-md ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  selected === 'steadfast'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                ST
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Steadfast Courier
                  {selected === 'steadfast' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </h4>
                <p className="text-[10px] text-slate-400">Doorstep delivery across 64 districts</p>
              </div>
            </div>
          </div>

          {steadfastBalance !== undefined && steadfastBalance !== null && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" />
                Wallet Balance:
              </span>
              <span className="font-semibold text-emerald-400 font-mono">
                ৳{steadfastBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Pathao Courier Card */}
        <div
          onClick={() => !disabled && pathaoAvailable && onSelect('pathao')}
          className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
            selected === 'pathao'
              ? 'bg-rose-950/20 border-rose-500 shadow-md ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          } ${disabled || !pathaoAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  selected === 'pathao'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                PT
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Pathao Logistics
                  {selected === 'pathao' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </h4>
                <p className="text-[10px] text-slate-400">Fast on-demand delivery & hub dispatch</p>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              API Service:
            </span>
            <span className="font-semibold text-emerald-400">
              {pathaoAvailable ? 'Active & Ready' : 'Service Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierProviderSelector;
