'use client';

import React from 'react';
import { DollarSign, ArrowDownRight, ShieldCheck, Wallet } from 'lucide-react';
import { CurrencyDisplay } from '../finance/CurrencyDisplay';

export interface CourierCodBreakdownCardProps {
  orderTotal: number;
  advancePaid?: number;
  courierDeliveryFee?: number;
  codCommissionPercent?: number; // e.g., 1% for Steadfast/Pathao
  isCod?: boolean;
  courierName?: string;
  className?: string;
}

export const CourierCodBreakdownCard: React.FC<CourierCodBreakdownCardProps> = ({
  orderTotal,
  advancePaid = 0,
  courierDeliveryFee = 60,
  codCommissionPercent = 1,
  isCod = true,
  courierName = 'Courier Partner',
  className = '',
}) => {
  // Amount courier must collect from customer
  const codToCollect = isCod ? Math.max(0, orderTotal - advancePaid) : 0;

  // Courier COD processing charge (1% of collected amount)
  const codFee = isCod ? Math.round((codToCollect * codCommissionPercent) / 100) : 0;

  // Net amount courier will disburse to merchant account
  const netMerchantReceivable = isCod
    ? Math.max(0, codToCollect - courierDeliveryFee - codFee)
    : 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-2.5 ${className}`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          {courierName} Settlement Preview
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          {isCod ? 'Cash on Delivery' : 'Prepaid Dispatch'}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Doorstep Cash to Collect (COD):</span>
          <CurrencyDisplay amount={codToCollect} size="sm" className="font-bold text-white" />
        </div>

        {advancePaid > 0 && (
          <div className="flex items-center justify-between text-emerald-400 text-[11px]">
            <span className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              Customer Advance Received:
            </span>
            <span>-<CurrencyDisplay amount={advancePaid} size="xs" className="text-emerald-400" /></span>
          </div>
        )}

        {isCod && (
          <>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Est. Delivery Deduction:</span>
              <span className="text-slate-300">-৳{courierDeliveryFee}</span>
            </div>

            {codFee > 0 && (
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>COD Fee ({codCommissionPercent}%):</span>
                <span>-৳{codFee}</span>
              </div>
            )}
          </>
        )}
      </div>

      {isCod && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-400">
            Est. Net Payout to Store:
          </span>
          <CurrencyDisplay
            amount={netMerchantReceivable}
            size="md"
            className="font-bold text-emerald-400"
          />
        </div>
      )}
    </div>
  );
};

export default CourierCodBreakdownCard;
