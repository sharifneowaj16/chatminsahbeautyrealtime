'use client';

import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export default function WelcomeCountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(23 * 3600 + 59 * 60 + 42);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTotalSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = mounted ? Math.floor(totalSeconds / 3600) : 23;
  const mins = mounted ? Math.floor((totalSeconds % 3600) / 60) : 59;
  const secs = mounted ? totalSeconds % 60 : 42;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-[#F2F6F0] border border-[#E2DED8] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 mb-2.5 sm:mb-3.5 flex items-center justify-between px-3 sm:px-3.5">
      <div className="flex items-center gap-1.5">
        <Timer className="w-4 h-4 text-[#845f06] animate-pulse" />
        <span className="text-[11px] text-[#1c3a13] font-semibold">
          Offer expires in:
        </span>
      </div>
      {/* Digital Timer Boxes */}
      <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
        <div className="bg-white border border-[#E2DED8] px-1.5 py-0.5 rounded text-[#1c3a13] shadow-xs">
          {pad(hours)}
        </div>
        <span className="text-[#1c3a13]">:</span>
        <div className="bg-white border border-[#E2DED8] px-1.5 py-0.5 rounded text-[#1c3a13] shadow-xs">
          {pad(mins)}
        </div>
        <span className="text-[#1c3a13]">:</span>
        <div className="bg-white border border-[#E2DED8] px-1.5 py-0.5 rounded text-[#9C4146] shadow-xs">
          {pad(secs)}
        </div>
      </div>
    </div>
  );
}
