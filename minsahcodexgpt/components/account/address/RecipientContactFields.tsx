"use client";

import React from "react";

interface RecipientContactFieldsProps {
  name: string;
  phone: string;
  onChangeName: (val: string) => void;
  onChangePhone: (val: string) => void;
}

export function RecipientContactFields({
  name,
  phone,
  onChangeName,
  onChangePhone,
}: RecipientContactFieldsProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#F8FAF7] flex flex-col gap-3 shadow-xs border border-[#E2DED8]/60">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-[#062402] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#4b6723]">badge</span>
          Recipient Contact Info
        </span>
        <span className="text-[10px] text-[#4b6723] font-bold uppercase tracking-wider bg-[#EAF7D8] px-2 py-0.5 rounded-full border border-[#4b6723]/20">
          KYC Verified
        </span>
      </div>

      {/* Full Name */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#43483f]">
          Full Name
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[#43483f] pointer-events-none">
            person
          </span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Recipient full name"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] text-xs font-medium focus:outline-none focus:bg-white border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
          />
        </div>
      </div>

      {/* Mobile Number with Bangladesh Flag & +880 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#43483f]">
            Mobile Number
          </label>
          <span className="text-[10px] text-[#4b6723] flex items-center gap-0.5 font-semibold">
            <span className="material-symbols-outlined text-[12px]">verified</span> SMS Track Active
          </span>
        </div>
        <div className="relative flex items-center">
          <div className="absolute left-3 flex items-center gap-1 pointer-events-none pr-1">
            <span className="text-sm">🇧🇩</span>
            <span className="text-xs font-bold text-[#062402]">+880</span>
          </div>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => onChangePhone(e.target.value)}
            placeholder="17XXXXXXXX"
            className="w-full pl-20 pr-10 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] text-xs font-medium focus:outline-none focus:bg-white border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
          />
          <span className="material-symbols-outlined absolute right-3 text-[#4b6723] text-[18px]">
            check_circle
          </span>
        </div>
      </div>
    </div>
  );
}
