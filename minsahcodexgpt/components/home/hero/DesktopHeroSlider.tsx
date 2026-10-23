'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide } from './types';
import HeroSlideItem from './HeroSlideItem';

interface DesktopHeroSliderProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

export default function DesktopHeroSlider({
  slides,
  intervalMs = 3000,
}: DesktopHeroSliderProps) {
  const totalSlides = slides?.length ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(totalSlides > 1 ? 1 : 0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const isSlidingRef = useRef(false);

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

  // Sync index if slides change
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

  // Seamless infinite loop jump on transition end
  const handleTransitionEnd = () => {
    isSlidingRef.current = false;
    if (totalSlides <= 1) return;

    if (activeIndex >= totalSlides + 1) {
      // Reached trailing clone -> jump silently back to index 1
      setIsTransitioning(false);
      setActiveIndex(1);
    } else if (activeIndex <= 0) {
      // Reached leading clone -> jump silently back to index totalSlides
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

  if (!slides || totalSlides === 0) return null;

  // Clone first & last slides for continuous forward/backward loop
  const displaySlides = totalSlides > 1
    ? [slides[totalSlides - 1], ...slides, slides[0]]
    : slides;

  // Step = 98% of container (leaving exactly 2% for next slide peek)
  const stepPx = containerWidth > 0 ? containerWidth * 0.98 : 0;
  const slideWidthPx = containerWidth > 0 ? containerWidth * 0.975 : 0;
  const gapPx = containerWidth > 0 ? containerWidth * 0.005 : 0;

  return (
    <div
      className="hidden md:block relative w-full max-w-[1440px] mx-auto px-4 lg:px-8 group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Clip viewport cleanly with zero left bleed */}
      <div ref={containerRef} className="w-full overflow-hidden">
        {/* 2% Peek Slider Track with Ultra-Smooth 750ms Cubic-Bezier Easing */}
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
              key={`${slide.id || 'desktop-hero-slide'}-${index}`}
              style={{ width: slideWidthPx > 0 ? `${slideWidthPx}px` : '97.5%' }}
              className="shrink-0 h-[220px] lg:h-[240px]"
            >
              <HeroSlideItem
                slide={slide}
                isPriority={index === 1 || index === 0}
                isMobile={false}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sleek Navigation Arrows (Visible on hover if >1 slide) */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-6 lg:left-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-stone-800 shadow-md backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95 focus:outline-none z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-stone-800 shadow-md backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95 focus:outline-none z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
