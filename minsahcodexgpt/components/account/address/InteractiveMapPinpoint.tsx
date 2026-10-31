"use client";

import React, { useState } from "react";

interface InteractiveMapPinpointProps {
  onLocationDetected?: (locationName: string) => void;
}

export function InteractiveMapPinpoint({ onLocationDetected }: InteractiveMapPinpointProps) {
  const [currentAddress, setCurrentAddress] = useState("Banani Model Town, Block E");
  const [isLocating, setIsLocating] = useState(false);
  const [isLocated, setIsLocated] = useState(false);

  const handleLocateMe = () => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      setIsLocated(true);
      const detected = "House 14, Road 7, Block E, Banani, Dhaka-1213";
      setCurrentAddress(detected);
      if (onLocationDetected) {
        onLocationDetected(detected);
      }
      setTimeout(() => {
        setIsLocated(false);
      }, 2000);
    }, 800);
  };

  return (
    <section className="px-4 pt-1 pb-2 flex flex-col gap-2">
      <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-xs border border-[#E2DED8]">
        {/* Map Background layer with Travertine / Street styling */}
        <div className="w-full h-full bg-gradient-to-br from-[#062402] via-[#153410] to-[#1c3a13] transition-transform duration-700" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#062402]/60 via-transparent to-[#062402]/20 pointer-events-none" />

        {/* Center Pulse Pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 rounded-full bg-[#D4F6A2]/60 animate-ping" />
            <div className="relative z-10 w-9 h-9 rounded-full bg-[#062402] text-[#ccee9b] flex items-center justify-center shadow-lg border border-white/20">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
            </div>
          </div>
        </div>

        {/* Floating GPS Bar */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
          <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#062402] text-[11px] font-semibold flex items-center gap-1.5 shadow-md border border-[#E2DED8]/60 truncate mr-2">
            <span className="w-2 h-2 rounded-full bg-[#4b6723] animate-pulse shrink-0" />
            <span className="truncate">{currentAddress}</span>
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            className="px-3 py-1.5 rounded-full bg-[#062402] hover:bg-[#1c3a13] text-white text-[11px] font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all shrink-0"
          >
            {isLocating ? (
              <>
                <span className="material-symbols-outlined text-[14px] text-[#ccee9b] animate-spin">
                  refresh
                </span>
                <span>Locating...</span>
              </>
            ) : isLocated ? (
              <>
                <span className="material-symbols-outlined text-[14px] text-[#ccee9b]">check</span>
                <span>Located!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[14px] text-[#ccee9b]">
                  my_location
                </span>
                <span>Locate Me</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Map Address Search Bar */}
      <div className="relative w-full mt-0.5">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#43483f] pointer-events-none">
          travel_explore
        </span>
        <input
          type="text"
          value={currentAddress}
          onChange={(e) => setCurrentAddress(e.target.value)}
          placeholder="Search street name, building number, or sector..."
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-[#efeeeb] text-[#1a1c1a] placeholder:text-[#43483f]/70 text-xs font-medium focus:outline-none focus:bg-[#F8FAF7] border border-[#E2DED8]/60 focus:border-[#4b6723] transition-all"
        />
        {currentAddress && (
          <button
            type="button"
            onClick={() => setCurrentAddress("")}
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-[#43483f] hover:text-[#062402] transition-colors"
          >
            cancel
          </button>
        )}
      </div>
    </section>
  );
}
