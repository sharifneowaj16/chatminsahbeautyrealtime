"use client";

import React from "react";

interface DeliveryCoordinatesFieldsProps {
  division: string;
  area: string;
  streetAddress: string;
  landmark: string;
  onChangeDivision: (val: string) => void;
  onChangeArea: (val: string) => void;
  onChangeStreetAddress: (val: string) => void;
  onChangeLandmark: (val: string) => void;
}

const DIVISIONS = ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh"];

const DHAKA_AREAS = [
  "Banani (Zone 1)",
  "Gulshan-1",
  "Gulshan-2",
  "Dhanmondi",
  "Uttara Sector 3-7",
  "Bashundhara R/A",
  "Mohakhali DOHS",
  "Mirpur DOHS",
  "Baridhara Diplomatic",
  "Mohammadpur",
  "Badda / Rampura",
];

export function DeliveryCoordinatesFields({
  division,
  area,
  streetAddress,
  landmark,
  onChangeDivision,
  onChangeArea,
  onChangeStreetAddress,
  onChangeLandmark,
}: DeliveryCoordinatesFieldsProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#F8FAF7] flex flex-col gap-3 shadow-xs border border-[#E2DED8]/60">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-[#062402] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#4b6723]">pin_drop</span>
          Delivery Coordinates
        </span>
        <span className="text-[10px] text-[#43483f] font-semibold bg-[#efeeeb] px-2 py-0.5 rounded-full">
          Same-Day Eligible
        </span>
      </div>

      {/* Division & Area Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#43483f]">
            Division
          </label>
          <div className="relative flex items-center">
            <select
              value={division}
              onChange={(e) => onChangeDivision(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] text-xs appearance-none focus:outline-none focus:bg-white border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
            >
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 text-[18px] text-[#43483f] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#43483f]">
            Area / Hub
          </label>
          <div className="relative flex items-center">
            <select
              value={area}
              onChange={(e) => onChangeArea(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] text-xs appearance-none focus:outline-none focus:bg-white border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
            >
              {DHAKA_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 text-[18px] text-[#43483f] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* House, Road & Flat Details */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#43483f]">
          House, Road &amp; Flat Details
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[#43483f] pointer-events-none">
            roofing
          </span>
          <input
            type="text"
            required
            value={streetAddress}
            onChange={(e) => onChangeStreetAddress(e.target.value)}
            placeholder="e.g. House 14, Road 7, Block E, Apartment 4B"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] text-xs font-medium focus:outline-none focus:bg-white border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
          />
        </div>
      </div>

      {/* Landmark / Courier Note */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#43483f]">
          Landmark / Courier Note
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[#43483f] pointer-events-none">
            explore
          </span>
          <input
            type="text"
            value={landmark}
            onChange={(e) => onChangeLandmark(e.target.value)}
            placeholder="e.g. Opposite Banani Club entrance, ring bell 4B"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] text-xs font-medium focus:outline-none focus:bg-white border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
          />
        </div>
      </div>
    </div>
  );
}
