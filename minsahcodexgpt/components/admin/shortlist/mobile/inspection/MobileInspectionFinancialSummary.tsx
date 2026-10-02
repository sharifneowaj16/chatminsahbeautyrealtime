// components/admin/shortlist/mobile/inspection/MobileInspectionFinancialSummary.tsx
'use client';

import React from 'react';
import { formatPrice } from '@/utils/currency';

export interface MobileInspectionFinancialSummaryProps {
  subtotal?: number;
  deliveryCharge?: number;
  discount?: number;
  paymentMethod?: string;
}

export const MobileInspectionFinancialSummary: React.FC<MobileInspectionFinancialSummaryProps> = ({
  subtotal = 1650,
  deliveryCharge = 60,
  discount = 0,
  paymentMethod = 'bKash (Pre-paid)',
}) => {
  const finalTotal = Math.max(0, subtotal + deliveryCharge - discount);

  return (
    <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 flex flex-col gap-2 font-mono text-xs select-none shadow-md">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1c2b3c]">
        <span className="font-bold text-white font-sans text-sm">Order Financial Summary</span>
        <span className="text-[10px] text-slate-400">{paymentMethod}</span>
      </div>

      <div className="space-y-1 text-slate-400 text-[11px]">
        <div className="flex justify-between">
          <span>Items Subtotal:</span>
          <span className="text-white font-bold">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Express Delivery Charge:</span>
          <span className="text-slate-300">+{formatPrice(deliveryCharge)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Special Promotion Discount:</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#1c2b3c] flex items-center justify-between">
        <span className="font-bold text-white font-sans">Total COD / Cleared</span>
        <span className="text-base font-black text-emerald-400">{formatPrice(finalTotal)}</span>
      </div>
    </div>
  );
};
export default MobileInspectionFinancialSummary;
