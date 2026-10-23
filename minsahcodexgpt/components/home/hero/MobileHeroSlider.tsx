'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { HeroSlide } from './types';
import HeroSlideItem from './HeroSlideItem';

interface MobileHeroSliderProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

export default function MobileHeroSlider({
  slides,
  intervalMs = 3000,
}: MobileHeroSliderProps) {
  const totalSlides = slides?.length ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(totalSlides > 1 ? 1 : 0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const isSlidingRef = useRef(false);
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

  // Measure container width accurately on mount & window resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    setActiveIndex(totalSlides > 1 ? 1 : 0);
    setIsTransitioning(true);
    isSlidingRef.current = false;
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    if (totalSlides <= 1 || isSlidingRef.current) return;
    isSlidingRef.current = true;
    setIsTransitioning(true);
    setActiveIndex((prev) => prev + 1);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1 || isSlidingRef.current) return;
    isSlidingRef.current = true;
    setIsTransitioning(true);
    setActiveIndex((prev) => prev - 1);
  }, [totalSlides]);

  const handleTransitionEnd = () => {
    isSlidingRef.current = false;
    if (totalSlides <= 1) return;

    if (activeIndex >= totalSlides + 1) {
      setIsTransitioning(false);
      setActiveIndex(1);
    } else if (activeIndex <= 0) {
      setIsTransitioning(false);
      setActiveIndex(totalSlides);
    }
  };

  // 3-Second Auto Scroll
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [handleNext, intervalMs, isPaused, totalSlides]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
  };

  if (!slides || totalSlides === 0) return null;

  const displaySlides = totalSlides > 1
    ? [slides[totalSlides - 1], ...slides, slides[0]]
    : slides;

  // Step = 98% of container (leaving exactly 2% for next slide peek)
  const stepPx = containerWidth > 0 ? containerWidth * 0.98 : 0;
  const slideWidthPx = containerWidth > 0 ? containerWidth * 0.975 : 0;
  const gapPx = containerWidth > 0 ? containerWidth * 0.005 : 0;

  return (
    <div
      className="w-full md:hidden select-none px-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Clip viewport cleanly with zero left bleed */}
      <div ref={containerRef} className="w-full overflow-hidden">
        <div
          className="flex"
          onTransitionEnd={handleTransitionEnd}
          style={{
            gap: `${gapPx}px`,
            transform: (totalSlides > 1 && stepPx > 0)
              ? `translate3d(-${activeIndex * stepPx}px, 0, 0)`
              : 'none',
            transition: isTransitioning
              ? 'transform 750ms cubic-bezier(0.25, 1, 0.5, 1)'
              : 'none',
            willChange: 'transform',
          }}
        >
          {displaySlides.map((slide, index) => (
            <div
              key={`${slide.id || 'mobile-hero-slide'}-${index}`}
              style={{ width: slideWidthPx > 0 ? `${slideWidthPx}px` : '97.5%' }}
              className="shrink-0 h-[145px] sm:h-[165px]"
            >
              <HeroSlideItem
                slide={slide}
                isPriority={index === 1 || index === 0}
                isMobile={true}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
