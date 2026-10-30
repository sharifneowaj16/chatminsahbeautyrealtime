'use client';

import React from 'react';
import { Truck } from 'lucide-react';

const PARTNERS = [
  { name: 'Steadfast Courier', type: 'Nationwide Hubs', badge: 'Primary Partner' },
  { name: 'Paperfly Express', type: 'Doorstep 64 Dists', badge: 'Doorstep COD' },
  { name: 'RedX Logistics', type: 'Thana Coverage', badge: 'Insured' },
  { name: 'Pathao Express', type: 'Dhaka Same-Day', badge: 'Express' },
];

export function CourierPartnerLogosGrid() {
  return (
    <section className="bg-white rounded-2xl p-4 border border-[#EADFD5] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="text-emerald-700" size={18} />
          <h3 className="text-sm font-bold text-[#2D1F18]">Logistics & Courier Partners</h3>
        </div>
        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider bg-emerald-100/60 px-2 py-0.5 rounded-full">
          API Integrated
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PARTNERS.map((p) => (
          <div
            key={p.name}
            className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#EADFD5]/60 flex flex-col justify-between"
          >
            <div>
              <span className="text-[9px] font-bold text-emerald-800 uppercase">{p.badge}</span>
              <p className="font-bold text-xs text-[#2D1F18] mt-0.5">{p.name}</p>
            </div>
            <p className="text-[10px] text-[#7A6E65] mt-1">{p.type}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
