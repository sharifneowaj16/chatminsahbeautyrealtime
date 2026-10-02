'use client';

import React from 'react';
import { Phone, MessageSquare, MapPin } from 'lucide-react';

interface MobileOrderCustomerSnippetProps {
  customerName: string;
  phone: string;
  address: string;
}

export const MobileOrderCustomerSnippet: React.FC<MobileOrderCustomerSnippetProps> = ({
  customerName,
  phone,
  address,
}) => {
  const initials = customerName
    ? customerName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CS';

  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  return (
    <div className="p-3 rounded-xl bg-[#122131] border border-[#1f2f45] shadow-sm flex flex-col gap-2 font-mono text-xs select-none">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/30">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-white font-bold truncate">
              {customerName}
            </span>
            <span className="text-[11px] text-slate-400">
              {phone}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`tel:${cleanPhone}`}
            className="w-8 h-8 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-indigo-300 flex items-center justify-center transition"
            title="Call Customer"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a
            href={`https://wa.me/${cleanPhone.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center transition"
            title="WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="pt-2 border-t border-[#1a2d42] flex items-start gap-1.5 text-[11px] text-slate-400">
        <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
        <span className="leading-snug">{address}</span>
      </div>
    </div>
  );
};
