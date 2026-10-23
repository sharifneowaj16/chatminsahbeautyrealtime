'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, Plane, Navigation, ChevronRight, Search } from 'lucide-react';
import type { MobileOrderRecord } from './types';
import OrderHistoryProductItem from './OrderHistoryProductItem';

interface OrderHistoryActiveOrderCardProps {
  order: MobileOrderRecord;
  onOpenLiveTracking: (orderId: string) => void;
}

export default function OrderHistoryActiveOrderCard({
  order,
  onOpenLiveTracking,
}: OrderHistoryActiveOrderCardProps) {
  const progress = order.transitProgress || {
    riderName: 'Shakil M.',
    hubName: 'Banani Hub',
    etaMinutes: 45,
    progressPercentage: 82,
    destinationAddress: 'House 14, Banani',
  };

  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm flex flex-col gap-3.5 relative overflow-hidden transition-all duration-300 border border-[#E2DED8]/60">
      {/* Top glowing ambient accent stripe */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#EAF7D8] via-[#e3e2e0] to-[#EAF7D8]" />

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 pt-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#062402] font-bold tracking-tight">
              {order.orderNumber}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#516d29] text-[11px] font-bold">
              <Truck className="w-3 h-3 text-[#4b6723]" />
              {order.statusLabel}
            </span>
          </div>
          <p className="text-xs text-[#43483f] mt-1 flex items-center gap-1.5 font-medium">
            <Plane className="w-3.5 h-3.5 text-[#4b6723]" />
            <span>{order.timestampLabel}</span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[16px] text-[#062402] font-bold block leading-none">
            ৳ {order.totalAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#4b6723] font-bold uppercase mt-1 inline-block bg-[#EAF7D8]/60 px-2 py-0.5 rounded-full">
            {order.paymentMethod}
          </span>
        </div>
      </div>

      {/* Mini Live Progress Indicator Box */}
      <div className="p-3 rounded-2xl bg-[#efeeeb] flex flex-col gap-2">
        <div className="flex items-center justify-between text-[#1a1c1a]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-4 h-4 text-[#4b6723] shrink-0" />
            <span className="text-xs font-bold text-[#062402] truncate">
              Rider En Route • {progress.destinationAddress}
            </span>
          </div>
          <span className="text-xs text-[#4b6723] font-bold shrink-0">
            ETA ~ {progress.etaMinutes} mins
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#F4F3EF] overflow-hidden flex">
          <div
            className="h-full rounded-full bg-[#4b6723] transition-all duration-500"
            style={{ width: `${progress.progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium text-[#43483f]">
          <span>Banani Sorting Hub</span>
          <span>Courier Dispatch Ready</span>
          <span className="font-bold text-[#062402]">{progress.hubName}</span>
        </div>
      </div>

      {/* Product Items Stream */}
      <div className="flex flex-col gap-2">
        {order.products.map((item) => (
          <OrderHistoryProductItem key={item.id} product={item} />
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onOpenLiveTracking(order.orderNumber)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border border-[#ccee9b]/20"
        >
          <Search className="w-4 h-4 text-[#D4F6A2]" />
          <span>Live Tracking</span>
        </button>

        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex items-center justify-center gap-1 h-10 px-4 rounded-full bg-[#efeeeb] hover:bg-[#e9e8e5] text-[#062402] text-xs font-bold active:scale-95 transition-all border border-[#E2DED8]/60"
        >
          <span>View Details</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}
