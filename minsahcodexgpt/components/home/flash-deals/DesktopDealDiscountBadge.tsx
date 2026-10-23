'use client';

import React from 'react';

interface DesktopDealDiscountBadgeProps {
  discountText?: string;
  className?: string;
}

export default function DesktopDealDiscountBadge({
  discountText,
  className = '',
}: DesktopDealDiscountBadgeProps) {
  if (!discountText) return null;

  return (
    <span
      className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full bg-red-600/95 text-white text-[10px] sm:text-[11px] font-bold tracking-tight shadow-md select-none ${className}`}
    >
      {discountText}
    </span>
  );
}
