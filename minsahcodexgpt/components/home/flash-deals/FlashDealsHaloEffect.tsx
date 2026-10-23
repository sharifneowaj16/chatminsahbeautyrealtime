'use client';

import React from 'react';

interface FlashDealsHaloEffectProps {
  className?: string;
}

export default function FlashDealsHaloEffect({
  className = '',
}: FlashDealsHaloEffectProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -top-16 inset-x-0 h-36 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/20 via-emerald-600/5 to-transparent blur-2xl opacity-75 ${className}`}
    />
  );
}
