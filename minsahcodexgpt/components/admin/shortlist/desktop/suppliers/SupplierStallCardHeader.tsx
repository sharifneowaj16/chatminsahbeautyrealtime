'use client';

import React from 'react';

interface SupplierStallCardHeaderProps {
  stallName: string;
  zone: string;
  standLocation: string;
  phone: string;
  contactPerson: string;
}

export const SupplierStallCardHeader: React.FC<SupplierStallCardHeaderProps> = ({
  stallName,
  zone,
  standLocation,
  phone,
  contactPerson,
}) => {
  return (
    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#112134]">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[9px] font-bold uppercase">
            {zone}
          </span>
          <h3 className="text-sm font-bold text-white tracking-tight">
            {stallName}
          </h3>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
          <span>📍</span> {standLocation}
        </p>
      </div>

      <div className="text-right">
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0d1e32] border border-[#193352] text-indigo-300 hover:text-white font-mono text-xs transition-colors"
          title="Call Stall"
        >
          <span>📞</span> {phone}
        </a>
        <span className="block text-[9px] text-slate-400 mt-0.5 font-mono">
          Rep: {contactPerson}
        </span>
      </div>
    </div>
  );
};
