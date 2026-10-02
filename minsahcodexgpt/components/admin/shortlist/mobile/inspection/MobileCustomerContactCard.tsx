// components/admin/shortlist/mobile/inspection/MobileCustomerContactCard.tsx
'use client';

import React from 'react';
import { MapPin, Phone, MessageSquare, Truck } from 'lucide-react';

export interface MobileCustomerContactCardProps {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod?: string;
  courierService?: string;
  loading?: boolean;
}

export const MobileCustomerContactCard: React.FC<MobileCustomerContactCardProps> = ({
  customerName,
  customerPhone,
  customerAddress,
  paymentMethod = 'PRE-PAID (bKash)',
  courierService,
  loading = false,
}) => {
  const cleanPhone = customerPhone.replace(/[^0-9+]/g, '');

  if (loading) {
    return (
      <div className="p-3.5 rounded-xl bg-[#0d1c2d] border border-[#1f2f45] flex flex-col gap-2.5 animate-pulse">
        <div className="h-4 w-1/3 bg-slate-700/60 rounded" />
        <div className="h-4 w-2/3 bg-slate-700/60 rounded" />
        <div className="h-4 w-1/2 bg-slate-700/60 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0d1c2d] border border-[#1f2f45] p-3.5 flex flex-col gap-2.5 shadow-md font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
        <span className="text-sm font-bold text-white font-sans">{customerName}</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
          {paymentMethod}
        </span>
      </div>

      <div className="flex items-start gap-1.5 text-slate-300">
        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span className="font-sans text-[11px] leading-tight text-slate-200">{customerAddress}</span>
      </div>

      {courierService && (
        <div className="flex items-center gap-1.5 text-slate-300 pt-0.5">
          <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-sans text-[11px] text-slate-300">{courierService}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-[#1c2b3c]">
        <span className="text-slate-400">{customerPhone}</span>
        <div className="flex items-center gap-2">
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center gap-1 font-bold active:scale-95 transition"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
          )}
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 flex items-center gap-1 font-black active:scale-95 transition"
            >
              <MessageSquare className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
export default MobileCustomerContactCard;
