'use client';

import React from 'react';
import { CurrencyDisplay } from './CurrencyDisplay';
import { DollarSign, ShieldAlert, ArrowDownRight, Tag } from 'lucide-react';

export interface OrderFinancialSummaryCardProps {
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  advancePaid?: number;
  total?: number;
  customerDeliveryCollected?: number;
  courierDeliveryActual?: number;
  profitMargin?: number;
  isCod?: boolean;
  className?: string;
}

export const OrderFinancialSummaryCard: React.FC<OrderFinancialSummaryCardProps> = ({
  subtotal,
  deliveryFee,
  discount = 0,
  advancePaid = 0,
  total: explicitTotal,
  customerDeliveryCollected,
  courierDeliveryActual,
  profitMargin,
  isCod = true,
  className = '',
}) => {
  const calculatedTotal = explicitTotal !== undefined ? explicitTotal : subtotal + deliveryFee - discount;
  const codReceivable = Math.max(0, calculatedTotal - advancePaid);

  const hasSubsidy =
    courierDeliveryActual !== undefined &&
    customerDeliveryCollected !== undefined &&
    courierDeliveryActual > customerDeliveryCollected;
  const subsidyAmount = hasSubsidy ? courierDeliveryActual - customerDeliveryCollected : 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          Financial Breakdown
        </span>
        {isCod ? (
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            COD Order
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Prepaid Order
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span>Items Subtotal</span>
          <CurrencyDisplay amount={subtotal} size="sm" />
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span>Delivery Charge</span>
          <CurrencyDisplay amount={deliveryFee} size="sm" />
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-rose-400">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Discount Applied
            </span>
            <span>-<CurrencyDisplay amount={discount} size="sm" className="text-rose-400" /></span>
          </div>
        )}

        {advancePaid > 0 && (
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              Advance Paid
            </span>
            <span>-<CurrencyDisplay amount={advancePaid} size="sm" className="text-emerald-400" /></span>
          </div>
        )}

        {hasSubsidy && subsidyAmount > 0 && (
          <div className="flex items-center justify-between text-amber-400/90 text-[11px] pt-1 border-t border-slate-800/60">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Delivery Fee Subsidy (Shop Absorbs)
            </span>
            <CurrencyDisplay amount={subsidyAmount} size="xs" />
          </div>
        )}
      </div>

      {/* Totals highlight */}
      <div className="pt-2 border-t border-slate-800 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Invoice Grand Total</span>
          <CurrencyDisplay amount={calculatedTotal} size="md" />
        </div>

        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
              {isCod ? 'Net COD to Collect' : 'Remaining Balance'}
            </span>
            <p className="text-[10px] text-slate-500">To be collected by courier at doorstep</p>
          </div>
          <CurrencyDisplay amount={codReceivable} size="lg" className="text-emerald-400 font-bold" />
        </div>
      </div>

      {profitMargin !== undefined && (
        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Est. Net Profit Margin</span>
          <span className="font-semibold text-slate-400">৳{profitMargin.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
};

export default OrderFinancialSummaryCard;
