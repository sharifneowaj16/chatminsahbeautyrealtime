'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

interface PreviousOrderSummary {
  orderNumber: string;
  deliveredDate: string;
  total: number;
  itemSummary: string;
}

interface LiveTrackingPreviousOrdersCardProps {
  previousOrder?: PreviousOrderSummary;
  onReorder?: (orderNumber: string) => void;
}

export default function LiveTrackingPreviousOrdersCard({
  previousOrder,
  onReorder,
}: LiveTrackingPreviousOrdersCardProps) {
  if (!previousOrder) return null;

  return (
    <div className="px-4 pb-8">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-bold text-[#062402]">Previous Order History</span>
        <Link
          href="/account/orders"
          className="text-[#4b6723] text-xs font-bold hover:underline"
        >
          View All
        </Link>
      </div>

      <div className="p-4 rounded-[26px] bg-[#efeeeb] shadow-2xs flex flex-col gap-3 border border-[#E2DED8]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#e3e2e0] text-[#062402] text-[10px] font-bold">
              Delivered
            </span>
            <span className="text-[11px] text-[#43483f] font-medium">
              {previousOrder.deliveredDate}
            </span>
          </div>
          <span className="text-xs font-bold text-[#062402]">
            ৳ {previousOrder.total.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#4b6723]">
              <CheckCircle2 className="w-4 h-4 text-[#4b6723]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#062402] block">
                {previousOrder.orderNumber}
              </span>
              <span className="text-[11px] text-[#43483f] truncate block">
                {previousOrder.itemSummary}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onReorder?.(previousOrder.orderNumber)}
            className="px-3 py-1.5 rounded-full bg-white text-[#062402] hover:bg-[#EAF7D8] text-[11px] font-bold active:scale-95 transition-all shrink-0 shadow-2xs"
          >
            Reorder
          </button>
        </div>
      </div>
    </div>
  );
}
