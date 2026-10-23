'use client';

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { StockProductSummary } from './types';

interface OutOfStockProductCardProps {
  product: StockProductSummary;
  onToggleNotification?: (enabled: boolean) => void;
}

export function OutOfStockProductCard({
  product,
  onToggleNotification,
}: OutOfStockProductCardProps) {
  const [notifyEnabled, setNotifyEnabled] = useState(true);

  const handleToggle = () => {
    const nextVal = !notifyEnabled;
    setNotifyEnabled(nextVal);
    if (onToggleNotification) {
      onToggleNotification(nextVal);
    }
  };

  return (
    <div className="p-4 rounded-[28px] bg-[#efeeeb] flex flex-col gap-3 border border-[#E2DED8]/60">
      <div className="flex gap-3.5 items-center">
        {/* Thumbnail with Out-of-Stock Overlay */}
        <div className="relative w-24 h-24 rounded-[22px] bg-white overflow-hidden shrink-0 shadow-sm border border-[#E2DED8]/60 flex items-center justify-center">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#062402]/25 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
              স্টক আউট
            </span>
          </div>
        </div>

        {/* Product Meta */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-white text-[#1a1c1a] text-[10px] font-bold shadow-xs">
              {product.brand}
            </span>
            <span className="text-[11px] text-[#4b6723] font-bold">100% Genuine</span>
          </div>

          <h3 className="text-[14px] text-[#062402] font-bold leading-snug line-clamp-1">
            {product.title}
          </h3>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[16px] text-[#ba1a1a] font-bold">
              ৳{product.price.toLocaleString('bn-BD')}
            </span>
            {product.regularPrice > product.price && (
              <span className="text-xs text-[#5A615D] line-through">
                ৳{product.regularPrice.toLocaleString('bn-BD')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Restock Notification Toggle Switch */}
      <div className="p-2.5 rounded-[20px] bg-white flex items-center justify-between gap-2 shadow-xs border border-[#E2DED8]/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#1c3a13] flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4 text-[#4b6723]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-bold text-[#1a1c1a] truncate">
              স্টকে আসলে নোটিফিকেশন দিন
            </span>
            <span className="text-[10px] text-[#5A615D] truncate">
              SMS ও WhatsApp এর মাধ্যমে অবহিত করা হবে
            </span>
          </div>
        </div>

        {/* Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={notifyEnabled}
          onClick={handleToggle}
          className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors shrink-0 ${
            notifyEnabled ? 'bg-[#4b6723]' : 'bg-[#e3e2e0]'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              notifyEnabled ? 'transform translate-x-5' : 'transform translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
