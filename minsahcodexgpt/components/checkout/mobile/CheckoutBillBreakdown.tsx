'use client';

import React from 'react';
import type { MobileCheckoutPricing } from './types';

interface CheckoutBillBreakdownProps {
  pricing: MobileCheckoutPricing;
}

export default function CheckoutBillBreakdown({ pricing }: CheckoutBillBreakdownProps) {
  return (
    <div className="flex flex-col p-5 rounded-[24px] bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-3.5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-[#181C1A] tracking-tight">
          Order Bill Breakdown
        </h2>
        <span className="text-[11px] font-bold text-[#5A615D] uppercase tracking-wider">
          Currency in BDT (৳)
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2 text-[13px]">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-[#5A615D]">
          <span>Cart Items Subtotal</span>
          <span className="font-semibold text-[#181C1A]">
            ৳{pricing.subtotal.toLocaleString('en-US')}
          </span>
        </div>

        {/* Air Freight */}
        <div className="flex items-center justify-between text-[#5A615D]">
          <div className="flex items-center gap-1.5">
            <span>Steadfast & Pathao Express Delivery</span>
            <svg className="text-[#4b6723]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            {pricing.shippingDiscount > 0 ? (
              <>
                <span className="line-through text-[#5A615D] text-[12px]">
                  ৳{pricing.shipping.toLocaleString('en-US')}
                </span>
                <span className="font-bold text-[#4b6723]">FREE</span>
              </>
            ) : (
              <span className="font-semibold text-[#181C1A]">
                ৳{pricing.shipping.toLocaleString('en-US')}
              </span>
            )}
          </div>
        </div>

        {/* Voucher */}
        {pricing.voucherDiscount > 0 && (
          <div className="flex items-center justify-between text-[#5A615D]">
            <span>Voucher ({pricing.voucherCode || 'PROMO'})</span>
            <span className="font-semibold text-[#4b6723]">
              -৳{pricing.voucherDiscount.toLocaleString('en-US')}
            </span>
          </div>
        )}

        {/* Glow Points */}
        {pricing.glowPointsDiscount > 0 && (
          <div className="flex items-center justify-between text-[#5A615D]">
            <span>Glow Points Redemption</span>
            <span className="font-semibold text-[#4b6723]">
              -৳{pricing.glowPointsDiscount.toLocaleString('en-US')}
            </span>
          </div>
        )}
      </div>

      <div className="h-px bg-[#E2DED8]/60 my-1" />

      {/* Final Total */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A615D]">
            Final Total
          </span>
          <span className="text-[22px] font-bold text-[#181C1A] tracking-tight">
            ৳{pricing.total.toLocaleString('en-US')}
          </span>
        </div>
        {pricing.totalSaved > 0 && (
          <span className="px-3 py-1 rounded-full bg-[#EAF7D8] text-[11px] font-bold text-[#1c3a13] border border-[#ccee9b]/50">
            Saved ৳{pricing.totalSaved.toLocaleString('en-US')} Today
          </span>
        )}
      </div>
    </div>
  );
}
