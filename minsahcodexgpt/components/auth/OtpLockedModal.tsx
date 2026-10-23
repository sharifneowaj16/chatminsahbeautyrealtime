"use client";

import React, { useState, useEffect } from "react";

interface OtpLockedModalProps {
  onClose: () => void;
  onOpenConcierge?: () => void;
}

export function OtpLockedModal({ onClose, onOpenConcierge }: OtpLockedModalProps) {
  const [minutes, setMinutes] = useState(14);
  const [seconds, setSeconds] = useState(59);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prevSec) => {
        if (prevSec > 0) return prevSec - 1;
        setMinutes((prevMin) => (prevMin > 0 ? prevMin - 1 : 0));
        return 59;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleConciergeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenConcierge) {
      onOpenConcierge();
    } else {
      window.dispatchEvent(new CustomEvent("minsah:open-concierge-mobile"));
    }
  };

  return (
    <div className="space-y-4 text-center py-2">
      {/* Red Lock Icon */}
      <div className="w-16 h-16 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto shadow-sm ring-8 ring-[#ffdad6]/40">
        <span className="material-symbols-outlined text-[32px]">lock_clock</span>
      </div>

      {/* Headlines */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a] font-bold text-[11px] border border-[#ba1a1a]/20 mb-1">
          <span className="material-symbols-outlined text-[14px]">gpp_bad</span>
          Security Protection Active
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#062402] tracking-tight">
          Account Temporarily Locked
        </h3>
        <p className="text-xs text-[#43483f] max-w-xs mx-auto leading-relaxed">
          Too many failed OTP verification attempts. Your account is temporarily frozen to prevent
          unauthorized access.
        </p>
      </div>

      {/* Countdown Card */}
      <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-[#E2DED8] flex items-center justify-between max-w-xs mx-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">
            hourglass_top
          </span>
          <span className="text-xs font-bold text-[#181C1A]">Unlocks in:</span>
        </div>
        <span className="font-mono text-base font-extrabold text-[#ba1a1a]">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* Concierge Unlock Option */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={handleConciergeClick}
          className="w-full py-3 px-4 rounded-full bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          Instant Unlock via WhatsApp Concierge
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-full bg-[#efeeeb] hover:bg-[#e9e8e5] text-[#1a1c1a] text-xs font-semibold transition-colors active:scale-[0.98]"
        >
          Close &amp; Try Later
        </button>
      </div>
    </div>
  );
}
