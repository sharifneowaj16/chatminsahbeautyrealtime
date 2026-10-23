'use client';

import type { ReactNode } from 'react';

interface ProductCarouselTrackProps {
  children: ReactNode;
  className?: string;
}

export default function ProductCarouselTrack({
  children,
  className = '',
}: ProductCarouselTrackProps) {
  return (
    <div
      className={`flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none select-none overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}
