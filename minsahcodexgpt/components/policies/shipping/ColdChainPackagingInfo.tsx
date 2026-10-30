'use client';

import React from 'react';
import { Thermometer, Layers, Snowflake, Lock } from 'lucide-react';

export function ColdChainPackagingInfo() {
  return (
    <section className="bg-white rounded-2xl p-4 border border-[#EADFD5] shadow-xs space-y-3">
      <div className="flex items-center gap-2">
        <Thermometer className="text-emerald-700" size={20} />
        <h3 className="text-sm font-bold text-[#2D1F18]">
          Thermal & Protective Packaging Protocol
        </h3>
      </div>
      <p className="text-xs text-[#7A6E65] leading-relaxed">
        To preserve active cosmetic compounds (such as Vitamin C, Retinol, Peptides, and Centella) from heat degradation during transit, we protect every shipment with a specialized 3-layer protective insulation:
      </p>

      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
        <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#EADFD5]/60 flex flex-col items-center">
          <Layers className="text-emerald-700 mb-1" size={20} />
          <p className="font-bold text-[11px] text-[#2D1F18]">Thermal Bubble Foil</p>
          <p className="text-[9px] text-[#7A6E65] mt-0.5">Heat Block Foil</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#EADFD5]/60 flex flex-col items-center">
          <Snowflake className="text-emerald-700 mb-1" size={20} />
          <p className="font-bold text-[11px] text-[#2D1F18]">Cooling Gel Pack</p>
          <p className="text-[9px] text-[#7A6E65] mt-0.5">18°C–22°C Stabilized</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF6F2] border border-[#EADFD5]/60 flex flex-col items-center">
          <Lock className="text-emerald-700 mb-1" size={20} />
          <p className="font-bold text-[11px] text-[#2D1F18]">Tamper-Proof Seal</p>
          <p className="text-[9px] text-[#7A6E65] mt-0.5">Hologram Locked</p>
        </div>
      </div>
    </section>
  );
}
