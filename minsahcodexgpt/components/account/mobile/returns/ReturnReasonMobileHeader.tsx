'use client';

import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';

interface ReturnReasonMobileHeaderProps {
  orderId: string;
  orderNumber: string;
}

export function ReturnReasonMobileHeader({
  orderId,
  orderNumber,
}: ReturnReasonMobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/account/orders/${orderId}`}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Back to order"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Select Return Reason
            </h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              ORDER #{orderNumber}
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/8801700000000?text=Hi%20Minsah%20Beauty,%20I%20have%20a%20question%20about%20return%20process"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Support</span>
        </a>
      </div>
    </header>
  );
}
