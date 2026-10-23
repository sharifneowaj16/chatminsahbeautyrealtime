'use client';

import React from 'react';
import { Package, ShieldCheck } from 'lucide-react';
import type { ShipmentItemLine } from './types';

interface LiveTrackingPackageItemsCardProps {
  items: ShipmentItemLine[];
  payment: {
    subtotal: number;
    freight: string;
    total: number;
    method: string;
  };
}

export default function LiveTrackingPackageItemsCard({
  items,
  payment,
}: LiveTrackingPackageItemsCardProps) {
  const totalItemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="px-4 mb-4">
      <div className="p-5 rounded-[28px] bg-white shadow-xs flex flex-col gap-3.5 border border-[#E2DED8]/60">
        <div className="flex items-center justify-between pb-1 border-b border-[#E2DED8]/40">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#4b6723]" />
            <h3 className="text-base font-bold text-[#062402]">Items in this Package</h3>
          </div>
          <span className="text-[11px] font-bold text-[#43483f]">
            {items.length} Products ({totalItemsCount} pcs)
          </span>
        </div>

        {/* Item Rows */}
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.id} className="p-3 rounded-2xl bg-[#efeeeb] flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white p-1 shrink-0 overflow-hidden shadow-2xs flex items-center justify-center border border-[#E2DED8]/50">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1608248597359-5773179267ff?auto=format&fit=crop&w=300&q=80';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-[13px] font-bold text-[#062402] truncate">{item.title}</h4>
                  <span className="text-xs font-bold text-[#062402] shrink-0">
                    ৳ {item.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-[#43483f] truncate">{item.variant}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold">
                    Qty: {item.quantity}
                  </span>
                  {item.hologramSealed && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#4b6723] font-bold">
                      <ShieldCheck className="w-3 h-3 text-[#4b6723]" />
                      Hologram Sealed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Summary */}
        <div className="pt-2 flex flex-col gap-1.5 border-t border-[#E2DED8]/40">
          <div className="flex items-center justify-between text-xs text-[#43483f] font-medium">
            <span>Subtotal &amp; Korean Air Express Freight</span>
            <span>৳ {payment.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#43483f] font-medium">
            <span>Dhaka Express Home Delivery</span>
            <span className="text-[#4b6723] font-bold">{payment.freight}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#062402]">Total Paid</span>
              <span className="px-2 py-0.5 rounded-full bg-[#EAF7D8] text-[#1c3a13] text-[10px] font-bold">
                {payment.method}
              </span>
            </div>
            <span className="text-base font-bold text-[#062402]">
              ৳ {payment.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
