'use client';

import React, { ReactNode } from 'react';
import FlashDealsHaloEffect from './FlashDealsHaloEffect';

interface FlashDealsCardWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function FlashDealsCardWrapper({
  children,
  className = '',
}: FlashDealsCardWrapperProps) {
  return (
    <div
      className={`relative w-full max-w-[1440px] mx-auto rounded-[28px] sm:rounded-[32px] bg-[#0A2612] border border-emerald-800/40 shadow-xl overflow-hidden p-4 sm:p-6 lg:p-7 text-white ${className}`}
    >
      {/* Top Ambient Halo Glow */}
      <FlashDealsHaloEffect />

      {/* Main Content */}
      <div className="relative z-10 w-full flex flex-col gap-4 sm:gap-6">
        {children}
      </div>
    </div>
  );
}
