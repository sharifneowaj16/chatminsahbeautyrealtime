'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn,
} from 'lucide-react';

export interface SeedHeroGalleryProps {
  /** List of image URLs from admin/backend */
  images: string[];
  /** Product title for accessibility and SEO alt tags */
  productName: string;
  /** Optional variant image override when user changes swatch/size */
  overrideImage?: string | null;
  /** Optional custom styling classes */
  className?: string;
}

export default function SeedHeroGallery({
  images = [],
  productName,
  overrideImage,
  className = '',
}: SeedHeroGalleryProps) {
  // Ensure we have a valid array of image sources with a high-end fallback
  const validImages = React.useMemo(() => {
    const list: string[] = [];
    if (overrideImage && overrideImage.trim() !== '') {
      list.push(overrideImage);
    }
    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() !== '' && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    // If empty, provide a clean luxury fallback
    if (list.length === 0) {
      list.push('/images/categories/Skincare.png');
    }
    return list;
  }, [images, overrideImage]);

  // Mobile active slide index
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Fullscreen Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Image load error tracking
  const [erroredImages, setErroredImages] = useState<Record<number, boolean>>({});

  const handleImageError = (index: number) => {
    setErroredImages((prev) => ({ ...prev, [index]: true }));
  };

  // Sync mobile scroll position to activeIndex
  const handleScroll = useCallback(() => {
    if (!carouselRef.current || isUserScrollingRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = container.offsetWidth * 0.85;
    if (itemWidth > 0) {
      const newIndex = Math.round(scrollLeft / itemWidth);
      const clamped = Math.max(0, Math.min(newIndex, validImages.length - 1));
      setActiveIndex(clamped);
    }
  }, [validImages.length]);

  const scrollToSlide = (index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const target = container.children[index] as HTMLElement;
    if (target) {
      isUserScrollingRef.current = true;
      setActiveIndex(index);
      target.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 400);
    }
  };

  const handlePrevSlide = () => {
    const prev = Math.max(0, activeIndex - 1);
    scrollToSlide(prev);
  };

  const handleNextSlide = () => {
    const next = Math.min(validImages.length - 1, activeIndex + 1);
    scrollToSlide(next);
  };

  // Lightbox navigation
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const nextLightbox = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  const prevLightbox = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  // Keyboard accessibility for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen, nextLightbox, prevLightbox]);

  // If overrideImage changes, scroll mobile slider to index 0
  useEffect(() => {
    if (overrideImage && carouselRef.current) {
      scrollToSlide(0);
    }
  }, [overrideImage]);

  // Partition images for desktop: Image 1 is Top Feature; remaining are 2-column grid
  const primaryImage = validImages[0];
  const secondaryImages = validImages.slice(1);

  return (
    <section className={`relative w-full ${className}`} aria-label={`${productName} Gallery`}>
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP VIEW (≥ 1024px): Seed.com Exact 5-Image Asymmetric Grid        */}
      {/* Exact: Gap 16px (1rem), Border Radius 24px (1.5rem), Ratio 4:3 / 16:10   */}
      {/* ========================================================================= */}
      <div className="hidden lg:block space-y-4">
        
        {/* TIER 1: Full-Width Primary Feature Hero Card (Image 1) */}
        <div
          onClick={() => openLightbox(0)}
          className="group relative w-full aspect-[4/3] overflow-hidden rounded-[24px] bg-[#122A16] border border-black/5 dark:border-white/10 shadow-sm cursor-zoom-in transition-all duration-300 hover:border-black/15 dark:hover:border-white/20"
        >
          {!erroredImages[0] ? (
            <Image
              src={primaryImage}
              alt={`${productName} - Main Formulation View`}
              fill
              priority
              sizes="(max-width: 1280px) 68vw, 703px"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              onError={() => handleImageError(0)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#122A16] text-white/50 font-sans text-sm">
              <span>Formulation View</span>
            </div>
          )}

          {/* Fullscreen Expand Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(0);
            }}
            aria-label="Expand image to fullscreen view"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/60 shadow-md"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* TIER 2 & TIER 3: 2-Column Asymmetric Sub-Grid (Images 2, 3, 4, 5, ...) */}
        {secondaryImages.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {secondaryImages.map((imgUrl, idx) => {
              const actualIndex = idx + 1;
              return (
                <div
                  key={`desktop-grid-${actualIndex}-${imgUrl}`}
                  onClick={() => openLightbox(actualIndex)}
                  className="group relative w-full aspect-[4/3] overflow-hidden rounded-[24px] bg-[#122A16] border border-black/5 dark:border-white/10 shadow-xs cursor-zoom-in transition-all duration-300 hover:border-black/15 dark:hover:border-white/20"
                >
                  {!erroredImages[actualIndex] ? (
                    <Image
                      src={imgUrl}
                      alt={`${productName} - Detail Showcase ${actualIndex + 1}`}
                      fill
                      loading="lazy"
                      sizes="(max-width: 1280px) 34vw, 343px"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      onError={() => handleImageError(actualIndex)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#122A16] text-white/50 font-sans text-xs">
                      <span>Detail View {actualIndex + 1}</span>
                    </div>
                  )}

                  {/* Zoom hint icon */}
                  <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <ZoomIn size={13} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE & TABLET VIEW (< 1024px): Touch-Snap Peeking Carousel           */}
      {/* ========================================================================= */}
      <div className="block lg:hidden w-full">
        
        {/* Horizontal Carousel Track with Peeking Cards */}
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex w-full gap-3 overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-2 scroll-smooth no-scrollbar"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {validImages.map((imgUrl, idx) => (
            <div
              key={`mobile-slide-${idx}-${imgUrl}`}
              onClick={() => openLightbox(idx)}
              className="relative shrink-0 w-[85vw] sm:w-[78vw] aspect-[4/4.5] overflow-hidden rounded-[20px] bg-[#122A16] border border-black/5 dark:border-white/10 shadow-md cursor-pointer"
              style={{ scrollSnapAlign: 'center' }}
            >
              {!erroredImages[idx] ? (
                <Image
                  src={imgUrl}
                  alt={`${productName} - Slide ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  loading={idx === 0 ? undefined : 'lazy'}
                  sizes="(max-width: 640px) 85vw, 78vw"
                  className="object-cover object-center"
                  onError={() => handleImageError(idx)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#122A16] text-white/50 font-sans text-sm">
                  <span>Slide {idx + 1}</span>
                </div>
              )}

              {/* Lightbox Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(idx);
                }}
                aria-label="Expand image"
                className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Seed-Style Minimal Interactive Slider Navigation Bar */}
        {validImages.length > 1 && (
          <div className="mt-3.5 flex items-center justify-between px-4 sm:px-6">
            
            {/* Left Chevron */}
            <button
              type="button"
              onClick={handlePrevSlide}
              disabled={activeIndex === 0}
              aria-label="Previous slide"
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                activeIndex === 0
                  ? 'border-black/5 dark:border-white/5 text-stone-300 dark:text-zinc-600 opacity-40 cursor-not-allowed'
                  : 'border-black/10 dark:border-white/20 text-[#122A16] dark:text-white bg-white dark:bg-zinc-800 shadow-xs active:scale-95'
              }`}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Slider Progress Bar Indicator */}
            <div className="flex-1 mx-4 max-w-[180px]">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-[#122A16] dark:bg-emerald-400 transition-all duration-300 ease-out"
                  style={{
                    width: `${(100 / validImages.length)}%`,
                    transform: `translateX(${activeIndex * 100}%)`,
                  }}
                />
              </div>
            </div>

            {/* Right Chevron + Counter Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400">
                {activeIndex + 1}/{validImages.length}
              </span>
              <button
                type="button"
                onClick={handleNextSlide}
                disabled={activeIndex === validImages.length - 1}
                aria-label="Next slide"
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                  activeIndex === validImages.length - 1
                    ? 'border-black/5 dark:border-white/5 text-stone-300 dark:text-zinc-600 opacity-40 cursor-not-allowed'
                    : 'border-black/10 dark:border-white/20 text-[#122A16] dark:text-white bg-white dark:bg-zinc-800 shadow-xs active:scale-95'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. FULLSCREEN LIGHTBOX MODAL (4K Zoom & Inspection)                        */}
      {/* ========================================================================= */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution Image Gallery Lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in-0 duration-200"
          onClick={closeLightbox}
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between z-10">
            <span className="text-xs font-mono uppercase tracking-widest text-white/70">
              {productName} • {lightboxIndex + 1} of {validImages.length}
            </span>
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Close fullscreen lightbox"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Lightbox Main Image Container */}
          <div
            className="relative h-[80vh] w-[90vw] sm:w-[85vw] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!erroredImages[lightboxIndex] ? (
              <Image
                src={validImages[lightboxIndex]}
                alt={`${productName} - Fullscreen View ${lightboxIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <span>Image unavailable</span>
              </div>
            )}
          </div>

          {/* Prev / Next Nav Buttons */}
          {validImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightbox();
                }}
                aria-label="Previous image"
                className="absolute left-3 sm:left-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightbox();
                }}
                aria-label="Next image"
                className="absolute right-3 sm:right-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Thumbnail Strip at Bottom of Lightbox */}
          {validImages.length > 1 && (
            <div
              className="absolute bottom-4 inset-x-0 flex justify-center gap-2 px-4 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {validImages.map((img, idx) => (
                <button
                  key={`lightbox-thumb-${idx}`}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border transition-all ${
                    lightboxIndex === idx
                      ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                      : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </section>
  );
}
