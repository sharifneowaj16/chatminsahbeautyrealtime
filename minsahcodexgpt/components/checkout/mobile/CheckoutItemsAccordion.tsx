'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { MobileCheckoutItem, MobileCheckoutGift } from './types';

interface CheckoutItemsAccordionProps {
  items: MobileCheckoutItem[];
  gift?: MobileCheckoutGift | null;
  subtotal: number;
}

export default function CheckoutItemsAccordion({
  items,
  gift,
  subtotal,
}: CheckoutItemsAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const itemCountLabel = gift
    ? `${items.length} + 1 Gift`
    : `${items.length} ${items.length === 1 ? 'Item' : 'Items'}`;

  return (
    <div className="flex flex-col p-5 rounded-[24px] bg-white border border-[#E2DED8]/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-4">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full text-left active:opacity-80 transition-opacity"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <svg className="text-[#4b6723]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <h2 className="text-[17px] font-bold text-[#181C1A] tracking-tight">
            Order Items ({itemCountLabel})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#5A615D]">
            ৳{subtotal.toLocaleString('en-US')}
          </span>
          <svg
            className={`text-[#5A615D] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="flex flex-col gap-3.5 pt-1 border-t border-[#E2DED8]/40">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3.5 pt-2">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F2F6F0] flex-shrink-0 flex items-center justify-center p-1 relative border border-[#E2DED8]/40">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-[#EAF7D8] flex items-center justify-center text-[#4b6723] text-xs font-bold">
                    MINSAH
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider">
                    {item.brand || 'K-Beauty'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#F2F6F0] text-[10px] font-bold text-[#5A615D]">
                    Qty {item.quantity}
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-[#181C1A] truncate mt-0.5">
                  {item.title}
                </span>
                <span className="text-[11px] font-medium text-[#5A615D]">
                  {item.badge || '100% Authentic Hologram'}
                </span>
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[14px] font-bold text-[#181C1A]">
                  ৳{(item.price * item.quantity).toLocaleString('en-US')}
                </span>
              </div>
            </div>
          ))}

          {/* Complimentary Free Gift Item */}
          {gift && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAF7] border border-[#EAF7D8] mt-1">
              <div className="w-10 h-10 rounded-full bg-[#EAF7D8] flex items-center justify-center flex-shrink-0 text-[#1c3a13]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-[#181C1A] truncate">
                  {gift.title}
                </span>
                <span className="text-[11px] font-medium text-[#4b6723]">
                  {gift.tierInfo} • {gift.batchNumber}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#4b6723] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF7D8]">
                FREE
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
