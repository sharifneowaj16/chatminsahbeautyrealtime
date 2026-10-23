'use client';

import React from 'react';
import { ChevronLeft, ShieldCheck, Radio } from 'lucide-react';
import { NotificationPreviewProduct } from './types';

interface SMSMessageBubbleProps {
  product: NotificationPreviewProduct;
}

export default function SMSMessageBubble({ product }: SMSMessageBubbleProps) {
  return (
    <div className="flex flex-col w-full rounded-[24px] overflow-hidden border border-[#E2DED8] bg-[#F3F4F6]">
      {/* Native SMS Sender Header */}
      <div className="bg-white px-4 py-2.5 border-b border-[#E2DED8] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ChevronLeft className="w-5 h-5 text-[#1c3a13]" />
          <div className="w-8 h-8 rounded-full bg-[#1c3a13]/10 text-[#1c3a13] flex items-center justify-center font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-[#1c3a13] tracking-wide">
                MINSAH-BD
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#EAF7D8] text-[#1c3a13] text-[8px] font-bold">
                SENDER ID
              </span>
            </div>
            <span className="text-[10px] text-[#5A615D]">
              Priority Telecom Route (Direct)
            </span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-[#4b6723]">
          Info
        </span>
      </div>

      {/* SMS Body Content */}
      <div className="p-4 flex flex-col gap-3 min-h-[300px]">
        {/* Timestamp */}
        <div className="self-center text-center">
          <span className="text-[10px] font-semibold text-[#5A615D]">
            Today 10:42 AM
          </span>
        </div>

        {/* Carrier Bubble */}
        <div className="self-start max-w-[92%] bg-white text-[#181C1A] rounded-2xl rounded-tl-sm p-3.5 shadow-xs border border-[#E2DED8] flex flex-col gap-2">
          <p className="text-xs text-[#1f2937] leading-relaxed">
            [Minsah Beauty Alert] {product.name} is now BACK IN STOCK! Direct authentic batch at {product.hub}. Price ৳{product.price.toLocaleString()}. Order now: <span className="text-blue-600 underline font-semibold">minsah.com.bd/r/{product.id}</span> (Reply STOP to opt out)
          </p>
          <div className="self-end text-[10px] text-[#5A615D] font-medium">
            Delivered • 10:42 AM
          </div>
        </div>

        {/* Telecommunication Route Verification Card */}
        <div className="rounded-xl bg-white/90 border border-[#E2DED8] p-3 flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b6723] flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              Telco Verified Network
            </span>
            <span className="text-[10px] text-[#5A615D] font-semibold">
              160 Char · 1 Segment
            </span>
          </div>
          <p className="text-[11px] text-[#5A615D] leading-tight">
            Dispatched via Grameenphone / Banglalink / Robi whitelisted alpha-numeric mask <strong className="text-[#1c3a13] font-bold">&quot;MINSAH-BD&quot;</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
