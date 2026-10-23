'use client';

import React from 'react';

interface HeroIndicatorTrackProps {
  totalSlides: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

export default function HeroIndicatorTrack({
  totalSlides,
  activeIndex,
  onSelect,
  className = '',
}: HeroIndicatorTrackProps) {
  if (totalSlides <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-1.5 py-2.5 ${className}`}>
      {Array.from({ length: totalSlides }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={`hero-indicator-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`transition-all duration-300 rounded-full h-1.5 ${
              isActive
                ? 'w-6 bg-primary dark:bg-emerald-600 shadow-xs'
                : 'w-1.5 bg-stone-300 hover:bg-stone-400 dark:bg-stone-600'
            }`}
          />
        );
      })}
    </div>
  );
}
