'use client';

import React from 'react';
import type { OrderItemSummary } from './types';

interface OrderPurchasedItemsCardProps {
  items: OrderItemSummary[];
  freeGift?: {
    title: string;
    description: string;
  };
  pricing: {
    subtotal: number;
    tariff: string;
    discount: number;
    total: number;
    saved: number;
  };
  paymentMethod?: string;
}

export default function OrderPurchasedItemsCard({
  items,
  freeGift,
  pricing,
  paymentMethod = 'bKash 1-Tap Paid',
}: OrderPurchasedItemsCardProps) {
  return (
    <section className="rounded-[28px] bg-[#F8FAF7] p-5 shadow-sm border border-[#E2DED8]/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-bold text-[#181C1A]">Purchased Items</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F2F6F0] text-[#5A615D] text-[11px] font-bold">
            {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider">
          Express Air Import
        </span>
      </div>

      {/* Item Rows */}
      <div className="flex flex-col divide-y divide-[#E2DED8]/60">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3.5 py-3">
            <div className="w-16 h-16 rounded-[20px] bg-white overflow-hidden flex-shrink-0 shadow-xs border border-[#E2DED8]/40 p-1 flex items-center justify-center">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-[#EAF7D8] flex items-center justify-center text-[#4b6723] text-xs font-bold">
                  K-BEAUTY
                </div>
              )}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] font-bold text-[#181C1A] truncate">
                {item.title}
              </span>
              <span className="text-[11px] text-[#5A615D]">
                Qty: {item.quantity} • {item.lotNumber || 'Authentic Batch #2024'}
              </span>
              <span className="text-[13px] text-[#062402] mt-0.5 font-bold">
                ৳{(item.price * item.quantity).toLocaleString('en-US')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Free Sample Kit Complimentary Item */}
      {freeGift && (
        <div className="mt-2 p-3 rounded-[20px] bg-[#EAF7D8]/60 flex items-center justify-between gap-3 border border-[#ccee9b]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#4b6723] shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12" />
                <rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-[#1c3a13]">
                {freeGift.title}
              </span>
              <span className="text-[10px] text-[#1c3a13]/80">
                {freeGift.description}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#4b6723] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white">
            FREE
          </span>
        </div>
      )}

      {/* Payment & Savings Breakdown */}
      <div className="mt-4 pt-3 bg-white rounded-[22px] p-4 space-y-2 border border-[#E2DED8]/60">
        <div className="flex justify-between items-center text-xs text-[#5A615D]">
          <span>Payment Method</span>
          <span className="font-bold text-[#181C1A] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E2136E]" />
            {paymentMethod}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-[#5A615D]">
          <span>Import Tariff &amp; Handling</span>
          <span className="font-bold text-[#4b6723]">{pricing.tariff}</span>
        </div>

        {pricing.discount > 0 && (
          <div className="flex justify-between items-center text-xs text-[#5A615D]">
            <span>Seasonal Promotion Discount</span>
            <span className="text-[#4b6723] font-bold">
              -৳{pricing.discount.toLocaleString('en-US')}
            </span>
          </div>
        )}

        <div className="h-px w-full bg-[#F2F6F0] my-1" />

        <div className="flex justify-between items-center pt-1">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#5A615D]">Total Amount Paid</span>
            {pricing.saved > 0 && (
              <span className="text-[11px] text-[#4b6723] font-bold">
                You saved ৳{pricing.saved.toLocaleString('en-US')} today
              </span>
            )}
          </div>
          <span className="text-[20px] text-[#062402] font-bold tracking-tight">
            ৳{pricing.total.toLocaleString('en-US')}
          </span>
        </div>
      </div>
    </section>
  );
}
