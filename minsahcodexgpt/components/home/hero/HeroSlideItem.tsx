'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroSlide } from './types';

interface HeroSlideItemProps {
  slide: HeroSlide;
  isPriority?: boolean;
  className?: string;
  imageClassName?: string;
  isMobile?: boolean;
}

export default function HeroSlideItem({
  slide,
  isPriority = false,
  className = '',
  imageClassName = '',
  isMobile = false,
}: HeroSlideItemProps) {
  const imageSrc = (isMobile && slide.mobileImageUrl) ? slide.mobileImageUrl : slide.imageUrl;
  const isInternalLink = slide.linkHref?.startsWith('/') ?? false;

  const content = (
    <div
      className={`relative w-full h-full overflow-hidden rounded-[20px] sm:rounded-[24px] shadow-sm border border-stone-200/60 bg-stone-100 group transition-all duration-300 ${className}`}
    >
      <Image
        src={imageSrc}
        alt={slide.title || 'Minsah Beauty Hero Banner'}
        fill
        sizes={isMobile ? '90vw' : '(max-width: 1280px) 90vw, 1200px'}
        priority={isPriority}
        loading={isPriority ? 'eager' : 'lazy'}
        className={`object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02] ${imageClassName}`}
      />
      {slide.title && (
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 bg-gradient-to-t from-black/60 via-black/20 to-transparent text-white">
          <p className="text-xs sm:text-base font-semibold tracking-wide drop-shadow-sm line-clamp-1">
            {slide.title}
          </p>
          {slide.subtitle && (
            <p className="text-[10px] sm:text-xs opacity-90 line-clamp-1 drop-shadow-sm mt-0.5">
              {slide.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (slide.linkHref) {
    if (isInternalLink) {
      return (
        <Link href={slide.linkHref} className="block w-full h-full cursor-pointer focus:outline-none">
          {content}
        </Link>
      );
    }
    return (
      <a
        href={slide.linkHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full cursor-pointer focus:outline-none"
      >
        {content}
      </a>
    );
  }

  return content;
}
