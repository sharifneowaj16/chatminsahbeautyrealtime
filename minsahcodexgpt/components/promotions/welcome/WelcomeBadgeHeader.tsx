'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface WelcomeBadgeHeaderProps {
  onClose: () => void;
}

export default function WelcomeBadgeHeader({ onClose }: WelcomeBadgeHeaderProps) {
  return (
    <div className="relative w-full flex flex-col items-center text-center pt-1 sm:pt-2">
      {/* Brand Logo / Monogram Tag */}
      <div className="flex items-center justify-center gap-1.5 mb-1.5 sm:mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#C59A27]" />
        <span className="font-serif tracking-[0.25em] text-[10px] sm:text-[11px] uppercase font-bold text-[#1c3a13]">
          MINSAH BEAUTY
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#C59A27]" />
      </div>

      {/* VIP Welcome Privilege Badge */}
      <div className="mx-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#EAF7D8] border border-[#B5C4BB]/60 mb-2 sm:mb-2.5">
        <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#1c3a13]" />
        <span className="text-[10px] sm:text-[11px] font-semibold text-[#1c3a13] tracking-wide">
          First-Time Visitor Privilege
        </span>
        <span className="text-[9px] sm:text-[10px] bg-[#1c3a13] text-white px-1.5 py-0.2 rounded-full font-bold ml-0.5">
          EXCLUSIVE
        </span>
      </div>

      {/* Headline: Premium Clean English */}
      <div className="text-center mb-2.5 sm:mb-3">
        <h2 className="text-[20px] sm:text-[24px] font-bold leading-snug tracking-tight text-[#1c3a13]">
          Welcome! Get{' '}
          <span className="text-[#845f06] font-extrabold underline decoration-[#D4AF37]/50 underline-offset-4">
            15% OFF
          </span>{' '}
          Your First Order
        </h2>
        <p className="text-[11px] sm:text-[12px] text-[#5A615D] mt-0.5 sm:mt-1 tracking-normal">
          Enjoy <span className="text-[#1c3a13] font-semibold">15% OFF</span> your first authentic skincare order
        </p>
      </div>
    </div>
  );
}
