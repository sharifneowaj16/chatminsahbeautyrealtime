'use client';

import React from 'react';
import type { MobileCheckoutAddress } from './types';

interface CheckoutDispatchCardProps {
  address: MobileCheckoutAddress;
  onChangeAddress: () => void;
}

export default function CheckoutDispatchCard({
  address,
  onChangeAddress,
}: CheckoutDispatchCardProps) {
  return (
    <div className="flex flex-col p-5 rounded-[24px] bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="text-[#4b6723]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h2 className="text-[17px] font-bold text-[#181C1A] tracking-tight">
            Dispatch Details
          </h2>
        </div>
        <button
          type="button"
          onClick={onChangeAddress}
          className="px-3.5 py-1 rounded-full bg-[#F2F6F0] hover:bg-[#e9e8e5] text-[#181C1A] text-[12px] font-bold active:scale-95 transition-transform"
        >
          Change
        </button>
      </div>

      {/* Recipient Details */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-bold text-[#181C1A]">
            {address.fullName || 'Valued Customer'}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#5A615D] opacity-40" />
          <span className="text-[14px] font-medium text-[#5A615D]">
            {address.phoneNumber || '+880 1700-000000'}
          </span>
        </div>
        <p className="text-[13px] text-[#5A615D] leading-relaxed">
          {address.streetAddress || 'Address details'}, {address.area ? `${address.area}, ` : ''}{address.city || 'Dhaka'}
        </p>
      </div>

      {/* Shipping and Delivery Status Pills */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F2F6F0] text-[#5A615D] text-[12px] font-medium">
          <svg className="text-[#4b6723] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span className="truncate">
            {address.deliveryTimeEstimate || 'Tomorrow by 6:00 PM'} • {address.hubName || 'Dhaka Express Van'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EAF7D8]/70 text-[#1c3a13] text-[12px] font-semibold">
          <svg className="text-[#4b6723] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
          </svg>
          <span>100% Genuine Sealed Packaging Active</span>
        </div>
      </div>
    </div>
  );
}
