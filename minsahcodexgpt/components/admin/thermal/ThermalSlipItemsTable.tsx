'use client';

import React from 'react';

export interface ThermalItemRow {
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  variant?: string;
}

export interface ThermalSlipItemsTableProps {
  items: ThermalItemRow[];
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  advancePaid?: number;
  grandTotal: number;
  isCod?: boolean;
  paymentMethod?: string;
  trxId?: string;
  footerMessage?: string;
  className?: string;
}

export const ThermalSlipItemsTable: React.FC<ThermalSlipItemsTableProps> = ({
  items,
  subtotal,
  deliveryFee = 0,
  discount = 0,
  advancePaid = 0,
  grandTotal,
  isCod = true,
  paymentMethod,
  trxId,
  footerMessage = 'Thank you for shopping with Minsah Beauty! Exchange accepted within 7 days with memo.',
  className = '',
}) => {
  const codBalance = Math.max(0, grandTotal - advancePaid);

  return (
    <div className={`py-2 text-[10px] space-y-2 ${className}`}>
      {/* Table Header */}
      <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[9px] uppercase tracking-wider">
        <span className="w-1/2">Item / Description</span>
        <span className="w-1/4 text-center">Qty x Rate</span>
        <span className="w-1/4 text-right">Total (৳)</span>
      </div>

      {/* Items list */}
      <div className="space-y-1">
        {items.map((it, idx) => (
          <div key={idx} className="flex justify-between items-start text-[9.5px] leading-tight">
            <div className="w-1/2 pr-1">
              <span className="font-semibold block truncate">{it.name}</span>
              {(it.sku || it.variant) && (
                <span className="text-[8.5px] text-gray-600 block">
                  {[it.sku, it.variant].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
            <div className="w-1/4 text-center tabular-nums">
              {it.quantity} x {it.price}
            </div>
            <div className="w-1/4 text-right font-bold tabular-nums">
              {it.total}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="pt-2 border-t border-dashed border-black space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Items Subtotal:</span>
          <span className="tabular-nums">৳{subtotal}</span>
        </div>

        {deliveryFee > 0 && (
          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span className="tabular-nums">৳{deliveryFee}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-gray-800">
            <span>Discount (Promo):</span>
            <span className="tabular-nums">-৳{discount}</span>
          </div>
        )}

        {advancePaid > 0 && (
          <div className="flex justify-between text-gray-800 font-semibold">
            <span>Advance Paid:</span>
            <span className="tabular-nums">-৳{advancePaid}</span>
          </div>
        )}

        <div className="flex justify-between font-extrabold text-[11px] pt-1 border-t border-black">
          <span>TOTAL PAYABLE:</span>
          <span className="tabular-nums">৳{grandTotal}</span>
        </div>

        {isCod && advancePaid > 0 && (
          <div className="flex justify-between font-bold text-[10.5px] bg-gray-100 p-1 border border-black mt-1">
            <span>NET COD TO COLLECT:</span>
            <span className="tabular-nums">৳{codBalance}</span>
          </div>
        )}
      </div>

      {/* Payment Information */}
      <div className="pt-1 border-t border-dotted border-gray-400 text-[9px] space-y-0.5">
        <div className="flex justify-between">
          <span>Payment Mode:</span>
          <span className="font-bold uppercase">
            {paymentMethod || (isCod ? 'Cash On Delivery (COD)' : 'Prepaid')}
          </span>
        </div>
        {trxId && (
          <div className="flex justify-between font-mono">
            <span>Trx ID:</span>
            <span>{trxId}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Settlement:</span>
          <span className="font-semibold">
            {isCod && codBalance > 0 ? 'PENDING DOORSTEP COD' : 'PAID IN FULL'}
          </span>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="pt-2 border-t border-dashed border-black text-center text-[9px] space-y-1">
        <p className="font-medium leading-relaxed">{footerMessage}</p>
        <p className="text-[8px] text-gray-600">*** Software by Minsah Beauty OS ***</p>
      </div>
    </div>
  );
};

export default ThermalSlipItemsTable;
