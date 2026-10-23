'use client';

import React from 'react';
import Image from 'next/image';

interface MobileDealThumbnailProps {
  imageUrl: string;
  title: string;
  discountBadge?: string;
  className?: string;
}

export default function MobileDealThumbnail({
  imageUrl,
  title,
  discountBadge,
  className = '',
}: MobileDealThumbnailProps) {
  return (
    <div
      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60 ${className}`}
    >
      <Image
        src={imageUrl}
        alt={title}
        fill
        sizes="96px"
        className="object-cover object-center"
      />

      {/* Bottom-left Discount Pill */}
      {discountBadge && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold shadow-xs">
          {discountBadge}
        </span>
      )}
    </div>
  );
}
