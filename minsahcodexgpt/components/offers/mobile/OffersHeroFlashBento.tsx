'use client';

import { useState, useEffect } from 'react';
import { Zap, Clock, Ticket, Copy, Check } from 'lucide-react';

interface OffersHeroFlashBentoProps {
  onCopyPromo: (code: string) => void;
}

export function OffersHeroFlashBento({ onCopyPromo }: OffersHeroFlashBentoProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 42,
    seconds: 18,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    setCopied(true);
    onCopyPromo('GLOW20');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatUnit = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="relative bg-[#28531c] text-white rounded-[28px] p-5 overflow-hidden shadow-md flex flex-col justify-between gap-4">
      {/* Visual Accent Glow */}
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[#ccee9b]/15 blur-2xl pointer-events-none" />

      {/* Top Header & Countdown */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ccee9b] text-[#1c3a13] text-[11px] font-bold uppercase tracking-wider shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-[#1c3a13]" />
          FLASH 24H DROP
        </span>

        <div className="flex items-center gap-1 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold font-mono text-white">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {formatUnit(timeLeft.hours)}h : {formatUnit(timeLeft.minutes)}m : {formatUnit(timeLeft.seconds)}s
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-1 mt-1">
        <h3 className="text-xl leading-tight font-bold text-white">
          Get 20% Off Glass Skin Formulations
        </h3>
        <p className="text-xs text-white/85 leading-relaxed">
          Valid on authentic Korean essences, serums &amp; hydrating ampoules over ৳2,500.
        </p>
      </div>

      {/* Voucher Action Bar */}
      <div className="relative z-10 pt-2 flex items-center justify-between gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 pl-1 min-w-0">
          <Ticket className="w-5 h-5 text-[#ccee9b] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] uppercase text-white/70 tracking-widest font-bold">
              Coupon Code
            </span>
            <span className="text-sm tracking-wider text-[#ccee9b] font-bold font-mono truncate">
              GLOW20
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2 rounded-full bg-[#ccee9b] text-[#1c3a13] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform hover:opacity-95 shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-800" />
              <span>Applied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>1-Tap Copy &amp; Apply</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
