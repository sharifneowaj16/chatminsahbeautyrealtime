'use client';

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { formatPrice } from '@/utils/currency';

export interface ProductCostPriceInputProps {
  costPrice: string;
  sellingPrice?: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ProductCostPriceInput({
  costPrice,
  sellingPrice,
  onChange,
  error,
}: ProductCostPriceInputProps) {
  const marginStats = useMemo(() => {
    const cost = parseFloat(costPrice) || 0;
    const sell = parseFloat(sellingPrice || '0') || 0;
    if (cost <= 0 || sell <= 0) return null;
    const profit = sell - cost;
    const marginPercent = ((profit / sell) * 100).toFixed(1);
    return {
      profit,
      marginPercent,
      isPositive: profit > 0,
    };
  }, [costPrice, sellingPrice]);

  return (
    <div className="p-3.5 rounded-lg border border-[#232636] bg-[#10121b] mt-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div>
          <label className="block text-xs font-semibold text-[#F7F8F8]">
            Unit Procurement Cost Price (BDT ৳)
          </label>
          <p className="text-[11px] text-white/40">
            Internal buying/import cost per unit for accurate net profit and shortlist accounting.
          </p>
        </div>

        {marginStats && (
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                marginStats.isPositive
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              }`}
            >
              {marginStats.isPositive ? '+' : ''}
              {marginStats.marginPercent}% Margin ({formatPrice(marginStats.profit)} profit)
            </span>
          </div>
        )}
      </div>

      <div className="max-w-xs">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={costPrice}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-1.5 bg-[#161824] border border-[#232636] rounded-md text-xs text-[#F7F8F8] placeholder:text-white/30 focus:ring-1 focus:ring-white/20"
        />
        {error && <p className="mt-1 text-[10px] text-rose-400">{error}</p>}
      </div>
    </div>
  );
}
