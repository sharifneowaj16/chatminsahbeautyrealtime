'use client';

import React from 'react';
import type { PaymentMethodType } from './types';

interface CheckoutPaymentSelectorProps {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  bkashSavedAmount?: number;
}

export default function CheckoutPaymentSelector({
  selectedMethod,
  onSelectMethod,
  bkashSavedAmount = 50,
}: CheckoutPaymentSelectorProps) {
  return (
    <div className="flex flex-col p-5 rounded-[24px] bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-4">
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="text-[#4b6723]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          <h2 className="text-[17px] font-bold text-[#181C1A] tracking-tight">
            Payment Method
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[11px] font-bold flex items-center gap-1 border border-[#B5C4BB]/30">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Instant & Secure
        </span>
      </div>

      {/* Payment Options Stack */}
      <div className="flex flex-col gap-2.5">
        {/* Option 1: bKash */}
        <label
          onClick={() => onSelectMethod('bkash')}
          className={`cursor-pointer flex flex-col p-3.5 rounded-2xl transition-all duration-150 border ${
            selectedMethod === 'bkash'
              ? 'bg-[#F2F6F0] border-[#062402] shadow-sm'
              : 'bg-[#F8FAF7] border-[#E2DED8]/60 hover:bg-[#F2F6F0]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#E2136E] text-white flex items-center justify-center flex-shrink-0 font-bold text-[14px] shadow-sm">
                bK
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#181C1A]">
                    bKash 1-Tap Checkout
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[#FFDFEC] text-[#9E0047] text-[10px] font-bold">
                    Save ৳{bkashSavedAmount}
                  </span>
                </div>
                <span className="text-[11px] text-[#5A615D] truncate">
                  Auto-Linked Instant Verification
                </span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedMethod === 'bkash' ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
            }`}>
              {selectedMethod === 'bkash' && (
                <span className="w-2 h-2 rounded-full bg-[#ccee9b]" />
              )}
            </div>
          </div>
        </label>

        {/* Option 2: Nagad */}
        <label
          onClick={() => onSelectMethod('nagad')}
          className={`cursor-pointer flex flex-col p-3.5 rounded-2xl transition-all duration-150 border ${
            selectedMethod === 'nagad'
              ? 'bg-[#F2F6F0] border-[#062402] shadow-sm'
              : 'bg-[#F8FAF7] border-[#E2DED8]/60 hover:bg-[#F2F6F0]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#F7941D] text-white flex items-center justify-center flex-shrink-0 font-bold text-[13px] shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-[#181C1A]">
                  Nagad Instant Pay
                </span>
                <span className="text-[11px] text-[#5A615D]">
                  Direct mobile wallet transfer
                </span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedMethod === 'nagad' ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
            }`}>
              {selectedMethod === 'nagad' && (
                <span className="w-2 h-2 rounded-full bg-[#ccee9b]" />
              )}
            </div>
          </div>
        </label>

        {/* Option 3: Card via SSLCommerz */}
        <label
          onClick={() => onSelectMethod('card')}
          className={`cursor-pointer flex flex-col p-3.5 rounded-2xl transition-all duration-150 border ${
            selectedMethod === 'card'
              ? 'bg-[#F2F6F0] border-[#062402] shadow-sm'
              : 'bg-[#F8FAF7] border-[#E2DED8]/60 hover:bg-[#F2F6F0]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#F2F6F0] text-[#181C1A] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#E2DED8]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-[#181C1A]">
                  Credit / Debit Card
                </span>
                <span className="text-[11px] text-[#5A615D]">
                  Visa, Mastercard, Amex via SSLCommerz
                </span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedMethod === 'card' ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
            }`}>
              {selectedMethod === 'card' && (
                <span className="w-2 h-2 rounded-full bg-[#ccee9b]" />
              )}
            </div>
          </div>
        </label>

        {/* Option 4: Cash on Delivery */}
        <label
          onClick={() => onSelectMethod('cod')}
          className={`cursor-pointer flex flex-col p-3.5 rounded-2xl transition-all duration-150 border ${
            selectedMethod === 'cod'
              ? 'bg-[#F2F6F0] border-[#062402] shadow-sm'
              : 'bg-[#F8FAF7] border-[#E2DED8]/60 hover:bg-[#F2F6F0]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#F2F6F0] text-[#181C1A] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#E2DED8]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="12" x="2" y="6" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold text-[#181C1A]">
                  Cash on Delivery (COD)
                </span>
                <span className="text-[11px] text-[#5A615D]">
                  Inspect authentic hologram seal at doorstep
                </span>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              selectedMethod === 'cod' ? 'bg-[#062402]' : 'bg-[#e3e2e0]'
            }`}>
              {selectedMethod === 'cod' && (
                <span className="w-2 h-2 rounded-full bg-[#ccee9b]" />
              )}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
