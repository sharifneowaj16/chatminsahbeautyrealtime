'use client';

import React from 'react';
import { Phone, MessageSquare, Copy } from 'lucide-react';

interface SupplierContactActionsProps {
  phone: string;
  contactPerson: string;
  stallName: string;
  onCopyPhone?: (phone: string) => void;
}

export const SupplierContactActions: React.FC<SupplierContactActionsProps> = ({
  phone,
  contactPerson,
  stallName,
  onCopyPhone,
}) => {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px]">
      <a
        href={`tel:${cleanPhone}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0b1b2d] border border-[#162e49] text-indigo-300 hover:text-white transition-colors"
        title={`Call ${contactPerson} (${stallName})`}
      >
        <Phone className="w-3 h-3 text-indigo-400" />
        <span>{phone}</span>
      </a>

      {onCopyPhone && (
        <button
          type="button"
          onClick={() => onCopyPhone(phone)}
          className="p-1 rounded bg-[#0b1b2d] border border-[#162e49] text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Copy Phone Number"
        >
          <Copy className="w-3 h-3" />
        </button>
      )}

      <a
        href={`https://wa.me/${cleanPhone.replace('+', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 hover:text-white transition-colors"
        title="WhatsApp Chat"
      >
        <MessageSquare className="w-3 h-3 text-emerald-400" />
        <span>WA</span>
      </a>
    </div>
  );
};
