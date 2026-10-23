"use client";

import React from "react";
import { TimingSlot } from "./types";

interface DeliveryTimingPreferencesProps {
  timingSlot: TimingSlot;
  isDefault: boolean;
  onSelectTimingSlot: (slot: TimingSlot) => void;
  onToggleDefault: (val: boolean) => void;
}

export function DeliveryTimingPreferences({
  timingSlot,
  isDefault,
  onSelectTimingSlot,
  onToggleDefault,
}: DeliveryTimingPreferencesProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#F8FAF7] flex flex-col gap-3 shadow-xs border border-[#E2DED8]/60">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-[#062402] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#4b6723]">schedule</span>
          Delivery Timing Window
        </span>
        <span className="text-[10px] text-[#43483f] font-semibold bg-[#efeeeb] px-2 py-0.5 rounded-full">
          Eco-batching
        </span>
      </div>

      {/* Timing Slot Radio Options */}
      <div className="grid grid-cols-1 gap-2">
        {/* Anytime */}
        <label
          onClick={() => onSelectTimingSlot("anytime")}
          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all border ${
            timingSlot === "anytime"
              ? "bg-white border-[#4b6723] shadow-xs"
              : "bg-[#efeeeb] border-[#E2DED8]/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`material-symbols-outlined text-[18px] ${
                timingSlot === "anytime" ? "text-[#4b6723]" : "text-[#43483f]"
              }`}
            >
              all_inclusive
            </span>
            <div className="flex flex-col">
              <span
                className={`text-xs font-bold ${
                  timingSlot === "anytime" ? "text-[#062402]" : "text-[#1a1c1a]"
                }`}
              >
                Anytime (9:00 AM – 9:00 PM)
              </span>
              <span className="text-[10px] text-[#43483f]">
                Recommended for prompt dispatch
              </span>
            </div>
          </div>
          <input
            type="radio"
            name="timing_slot"
            checked={timingSlot === "anytime"}
            onChange={() => onSelectTimingSlot("anytime")}
            className="w-4 h-4 accent-[#4b6723] cursor-pointer"
          />
        </label>

        {/* Work Hours */}
        <label
          onClick={() => onSelectTimingSlot("work")}
          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all border ${
            timingSlot === "work"
              ? "bg-white border-[#4b6723] shadow-xs"
              : "bg-[#efeeeb] border-[#E2DED8]/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`material-symbols-outlined text-[18px] ${
                timingSlot === "work" ? "text-[#4b6723]" : "text-[#43483f]"
              }`}
            >
              business_center
            </span>
            <div className="flex flex-col">
              <span
                className={`text-xs font-bold ${
                  timingSlot === "work" ? "text-[#062402]" : "text-[#1a1c1a]"
                }`}
              >
                Work Hours (10:00 AM – 6:00 PM)
              </span>
              <span className="text-[10px] text-[#43483f]">
                Ideal for corporate reception delivery
              </span>
            </div>
          </div>
          <input
            type="radio"
            name="timing_slot"
            checked={timingSlot === "work"}
            onChange={() => onSelectTimingSlot("work")}
            className="w-4 h-4 accent-[#4b6723] cursor-pointer"
          />
        </label>
      </div>

      {/* Set as Default Address Switch */}
      <div className="mt-1 pt-2 border-t border-[#E2DED8]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#EAF7D8] text-[#4b6723] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">grade</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#062402]">
              Set as Default Delivery Address
            </span>
            <span className="text-[10px] text-[#43483f]">
              Used automatically for 1-Tap K-Beauty checkout
            </span>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => onToggleDefault(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[#efeeeb] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4b6723]" />
        </label>
      </div>
    </div>
  );
}
