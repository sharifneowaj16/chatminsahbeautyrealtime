'use client';

import React from 'react';
import Link from 'next/link';

interface OrderActionButtonsProps {
  orderNumber: string;
  whatsappUrl?: string;
  onViewInvoice?: () => void;
}

export default function OrderActionButtons({
  orderNumber,
  whatsappUrl = 'https://wa.me/',
  onViewInvoice,
}: OrderActionButtonsProps) {
  return (
    <section className="flex flex-col gap-3 pt-2">
      {/* Primary CTA: Track Live Delivery */}
      <Link
        href={`/account/orders`}
        className="w-full h-14 rounded-full bg-[#062402] text-white text-[13px] font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-[#062402]/20 active:scale-[0.99] transition-all hover:bg-[#1c3a13]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <span>Track Live Delivery &amp; Express Rider</span>
      </Link>

      {/* Secondary CTA: Digital Invoice */}
      <button
        type="button"
        onClick={onViewInvoice || (() => alert(`Displaying digital tax invoice for order ${orderNumber}`))}
        className="w-full h-12 rounded-full bg-[#F2F6F0] text-[#181C1A] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#e9e8e5] transition-colors active:scale-[0.99] border border-[#E2DED8]/60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
          <path d="M16 8h-6" />
          <path d="M16 12h-6" />
          <path d="M16 16h-6" />
        </svg>
        <span>View Digital Receipt &amp; Tax Invoice</span>
      </button>

      {/* Tertiary WhatsApp Concierge Link */}
      <div className="pt-1 flex justify-center">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 py-2 px-4 rounded-full text-[#4b6723] hover:bg-[#EAF7D8]/50 transition-colors text-[12px] font-bold"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Need help? Chat with Dhaka Skincare Concierge</span>
        </a>
      </div>
    </section>
  );
}
