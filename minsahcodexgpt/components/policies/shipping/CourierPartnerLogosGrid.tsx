"use client";

import React from "react";

const PARTNERS = [
  { name: "Steadfast Courier", type: "Nationwide Hubs", badge: "Primary Partner" },
  { name: "Paperfly Express", type: "Doorstep 64 Dists", badge: "Doorstep COD" },
  { name: "RedX Logistics", type: "Thana Coverage", badge: "Insured" },
  { name: "Pathao Express", type: "Dhaka Same-Day", badge: "Express" },
];

export function CourierPartnerLogosGrid() {
  return (
    <section className="bg-white rounded-2xl p-4 border border-[#E2DED8] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4b6723] text-xl">hub</span>
          <h3 className="text-sm font-bold text-[#062402]">লজিস্টিকস ও কুরিয়ার পার্টনার</h3>
        </div>
        <span className="text-[10px] text-[#4b6723] font-bold uppercase tracking-wider bg-[#ccee9b]/30 px-2 py-0.5 rounded-full">
          API Integrated
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PARTNERS.map((p) => (
          <div
            key={p.name}
            className="p-2.5 rounded-xl bg-[#F8FAF7] border border-[#E2DED8]/40 flex flex-col justify-between"
          >
            <div>
              <span className="text-[9px] font-bold text-[#4b6723] uppercase">{p.badge}</span>
              <p className="font-bold text-xs text-[#062402] mt-0.5">{p.name}</p>
            </div>
            <p className="text-[10px] text-[#5A615D] mt-1">{p.type}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
