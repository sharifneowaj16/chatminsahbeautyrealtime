'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface MobileOrderCourierSnippetProps {
  orderTotal: number;
  deliveryFee?: number;
  wholesaleCost?: number;
  grossProfit?: number;
  marginPercent?: number;
}

export const MobileOrderCourierSnippet: React.FC<MobileOrderCourierSnippetProps> = ({
  orderTotal,
  deliveryFee = 60,
  wholesaleCost = Math.round(orderTotal * 0.65),
  grossProfit = Math.max(0, orderTotal - wholesaleCost - deliveryFee),
  marginPercent = orderTotal > 0 ? Math.round((grossProfit / orderTotal) * 100) : 0,
}) => {
  return (
    <div className="p-3 rounded-xl bg-[#122131] border border-[#1f2f45] shadow-sm font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-[#1c2b3c]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Truck className="w-4 h-4 text-indigo-400" />
          <span className="font-bold">Courier &amp; Delivery Financials</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
          +{marginPercent}% Gross
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 pt-1 text-center">
        <div>
          <span className="text-[9px] text-slate-400 uppercase block">COD Bill</span>
          <span className="text-white font-bold block mt-0.5">{formatPrice(orderTotal)}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase block">Est. Buy</span>
          <span className="text-amber-400 font-bold block mt-0.5">{formatPrice(wholesaleCost)}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase block">Net Profit</span>
          <span className="text-emerald-400 font-bold block mt-0.5">+{formatPrice(grossProfit)}</span>
        </div>
      </div>
    </div>
  );
};
