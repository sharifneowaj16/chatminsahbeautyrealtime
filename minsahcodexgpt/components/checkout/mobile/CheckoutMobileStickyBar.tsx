'use client';

import React from 'react';
import type { PaymentMethodType } from './types';

interface CheckoutMobileStickyBarProps {
  total: number;
  paymentMethod: PaymentMethodType;
  isSubmitting: boolean;
  onPlaceOrder: () => void;
}

export default function CheckoutMobileStickyBar({
  total,
  paymentMethod,
  isSubmitting,
  onPlaceOrder,
}: CheckoutMobileStickyBarProps) {
  const getCtaText = () => {
    if (isSubmitting) return 'Processing...';
    switch (paymentMethod) {
      case 'bkash':
        return `Pay ৳${total.toLocaleString('en-US')} with bKash`;
      case 'nagad':
        return `Pay ৳${total.toLocaleString('en-US')} with Nagad`;
      case 'card':
        return `Pay ৳${total.toLocaleString('en-US')} with Card`;
      case 'cod':
      default:
        return 'Place Cash on Delivery';
    }
  };

  return (
    <aside className="fixed bottom-0 w-full z-50 pb-safe bg-[#faf9f6]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(6,36,2,0.08)] border-t border-[#E2DED8]/60">
      <div className="px-5 pt-2 pb-3.5 flex flex-col gap-2 max-w-lg mx-auto">
        {/* Security badge pill */}
        <div className="flex items-center justify-center gap-1.5 py-0.5 px-3 rounded-full bg-[#F2F6F0] self-center">
          <svg className="text-[#4b6723]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[10px] font-bold text-[#5A615D] uppercase tracking-wider">
            256-Bit SSL Encrypted Checkout
          </span>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-3.5">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#5A615D] uppercase tracking-wider">
              Total Due
            </span>
            <span className="text-[20px] font-bold text-[#181C1A] tracking-tight">
              ৳{total.toLocaleString('en-US')}
            </span>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onPlaceOrder}
            className="flex-1 h-12 px-5 rounded-full bg-[#062402] hover:bg-[#1c3a13] disabled:opacity-60 text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(6,36,2,0.18)] active:scale-[0.98] transition-all"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
            <span>{getCtaText()}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
