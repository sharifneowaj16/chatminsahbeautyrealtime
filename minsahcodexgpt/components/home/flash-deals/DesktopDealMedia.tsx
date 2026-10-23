'use client';

import React from 'react';
import Image from 'next/image';
import DesktopDealDiscountBadge from './DesktopDealDiscountBadge';
import DesktopDealRatingBadge from './DesktopDealRatingBadge';

interface DesktopDealMediaProps {
  imageUrl: string;
  title: string;
  discountBadge?: string;
  rating?: number;
  ratingCount?: number;
  className?: string;
}

export default function DesktopDealMedia({
  imageUrl,
  title,
  discountBadge,
  rating,
  ratingCount,
  className = '',
}: DesktopDealMediaProps) {
  return (
    <div
      className={`relative w-full aspect-square rounded-xl overflow-hidden bg-stone-100 group-hover:opacity-95 transition-all duration-300 ${className}`}
    >
      <Image
        src={imageUrl}
        alt={title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 240px"
        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
      />

      {/* Top Overlays */}
      <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10">
        <DesktopDealDiscountBadge discountText={discountBadge} />
        <DesktopDealRatingBadge rating={rating} ratingCount={ratingCount} />
      </div>
    </div>
  );
}
