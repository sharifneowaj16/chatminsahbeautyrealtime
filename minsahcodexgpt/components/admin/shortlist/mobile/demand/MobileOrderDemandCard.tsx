'use client';

import React from 'react';
import { EnrichedOrderDemand } from '@/app/admin/shortlist/components/mobile/MobileOrdersDemandSheet';
import { MobileOrderDemandStatusPill } from './MobileOrderDemandStatusPill';
import { Clock, Truck, ChevronRight } from 'lucide-react';

interface MobileOrderDemandCardProps {
  order: EnrichedOrderDemand;
  onSelect: (order: EnrichedOrderDemand) => void;
}

export const MobileOrderDemandCard: React.FC<MobileOrderDemandCardProps> = ({
  order,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(order)}
      className="p-3 rounded-xl bg-[#091524] border border-[#162940] hover:border-indigo-500/50 flex flex-col gap-2 cursor-pointer transition select-none shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-400">
              {order.orderNumber}
            </span>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>2h ago</span>
            </span>
          </div>

          <div className="text-xs font-semibold text-white mt-0.5">
            {order.customerName || 'Customer'}
          </div>
          <div className="text-[10px] text-slate-400 truncate font-mono">
            {order.address || order.area || 'Dhaka Metro'}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-mono text-xs font-extrabold">
            {order.quantity} pcs
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Total: ৳{order.orderTotal || 1200}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#122237] text-[10px] font-mono">
        <div className="flex items-center gap-1 text-slate-400 truncate">
          <Truck className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate">{order.courierService || 'Steadfast Courier'}</span>
        </div>

        <div className="flex items-center gap-1 text-indigo-400 font-semibold shrink-0">
          <span>Details</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>

      <MobileOrderDemandStatusPill
        urgencyLabel={order.urgencyLabel}
        shippingType={order.shippingType}
        paymentMethod={order.paymentMethod}
      />
    </div>
  );
};
