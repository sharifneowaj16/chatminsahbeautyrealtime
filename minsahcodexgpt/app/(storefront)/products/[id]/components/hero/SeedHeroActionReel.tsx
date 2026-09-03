'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  Play,
  Pause,
  X,
  ShoppingBag,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

export interface ActionReelItem {
  id: string;
  title: string;
  creator?: string;
  avatarText?: string;
  posterUrl: string;
  videoUrl?: string;
}

export interface SeedHeroActionReelProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  /** Direct array of reels or admin JSON object from descriptionSections/productSpecs */
  reels?: ActionReelItem[] | unknown;
  /** Admin toggle to enable/disable reels section for this product */
  enabled?: boolean;
  className?: string;
}

export default function SeedHeroActionReel({
  productId,
  productName,
  productPrice,
  productImage = '/images/categories/Skincare.png',
  reels,
  enabled = true,
  className = '',
}: SeedHeroActionReelProps) {
  const { addItem } = useCart();
  const { openDrawer: openCartDrawer } = useCartDrawer();

  // Active Story Modal State
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Video Element Reference
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Touch Swipe coordinates
  const touchStartXRef = useRef<number | null>(null);

  // =========================================================================
  // 1. ADMIN DYNAMIC REELS PARSER (Supports all DB & API schema variations)
  // =========================================================================
  const parsedReels: ActionReelItem[] = useMemo(() => {
    // A. Direct array passed
    if (Array.isArray(reels) && reels.length > 0) {
      return reels.map((r: any, idx: number) => ({
        id: r.id || `reel-${idx + 1}`,
        title: r.title || 'Texture & Application Demo',
        creator: r.creator || '@minsahbeauty',
        avatarText: r.avatarText || r.creator?.replace('@', '').slice(0, 1).toUpperCase() || 'M',
        posterUrl: r.posterUrl || r.image || r.thumbnail || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
        videoUrl: r.videoUrl || r.url || r.video || undefined,
      }));
    }

    // B. Nested inside admin descriptionSections / productSpecs JSON object
    if (reels && typeof reels === 'object') {
      const obj = reels as Record<string, any>;
      const list = obj.actionReels || obj.reels || obj.videos || obj.videoClips;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((r: any, idx: number) => ({
          id: r.id || `reel-${idx + 1}`,
          title: r.title || 'Texture & Application Demo',
          creator: r.creator || '@minsahbeauty',
          avatarText: r.avatarText || r.creator?.replace('@', '').slice(0, 1).toUpperCase() || 'M',
          posterUrl: r.posterUrl || r.image || r.thumbnail || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
          videoUrl: r.videoUrl || r.url || r.video || undefined,
        }));
      }
    }

    // C. Default luxury demonstration reels
    return [
      {
        id: 'reel-1',
        title: 'Texture & Glass-Glow',
        creator: '@minsah',
        avatarText: 'M',
        posterUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'reel-2',
        title: 'Morning 3-Step Ritual',
        creator: '@dermalab',
        avatarText: 'D',
        posterUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'reel-3',
        title: '30-Day Dermal Results',
        creator: '@glowskin',
        avatarText: 'S',
        posterUrl: 'https://images.unsplash.com/photo-1608248597359-54316d7a5b39?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'reel-4',
        title: 'Shade & Finish Swatch',
        creator: '@ritual',
        avatarText: 'R',
        posterUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80',
      },
    ];
  }, [reels]);

  // If explicitly disabled by admin, return null
  if (!enabled || parsedReels.length === 0) {
    return null;
  }

  // Open Modal
  const openStory = (index: number) => {
    setActiveStoryIndex(index);
    setProgress(0);
    setIsPaused(false);
    setIsStoryModalOpen(true);
  };

  // Close Modal
  const closeStory = useCallback(() => {
    setIsStoryModalOpen(false);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  // Next Story
  const nextStory = useCallback(() => {
    if (activeStoryIndex < parsedReels.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      closeStory();
    }
  }, [activeStoryIndex, parsedReels.length, closeStory]);

  // Prev Story
  const prevStory = useCallback(() => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [activeStoryIndex]);

  // Toggle Play / Pause
  const togglePlayPause = () => {
    setIsPaused((prev) => {
      const nextState = !prev;
      if (videoRef.current) {
        if (nextState) videoRef.current.pause();
        else videoRef.current.play().catch(() => {});
      }
      return nextState;
    });
  };

  // Toggle Mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const nextMute = !prev;
      if (videoRef.current) {
        videoRef.current.muted = nextMute;
      }
      return nextMute;
    });
  };

  // Progress Bar Timer (5 seconds story)
  useEffect(() => {
    if (!isStoryModalOpen || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isStoryModalOpen, isPaused, nextStory]);

  // Play Video when active story changes
  useEffect(() => {
    if (isStoryModalOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
    }
  }, [isStoryModalOpen, activeStoryIndex]);

  // Keyboard accessibility
  useEffect(() => {
    if (!isStoryModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStory();
      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isStoryModalOpen, closeStory, nextStory, prevStory]);

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 45) {
      if (diff > 0) nextStory();
      else prevStory();
    }
    touchStartXRef.current = null;
  };

  // In-Video Quick Order Handler
  const handleOrderFromStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id: productId,
      productId: productId,
      name: productName,
      price: productPrice,
      image: productImage,
      quantity: 1,
    });
    closeStory();
    openCartDrawer();
  };

  const currentReel = parsedReels[activeStoryIndex] || parsedReels[0];

  return (
    <section className={`w-full py-2.5 ${className}`} aria-label="See It In Action Video Reels">
      
      {/* ========================================================================= */}
      {/* 1. SECTION HEADER                                                         */}
      {/* ========================================================================= */}
      <div className="flex items-end justify-between mb-3.5">
        <div>
          <span className="inline-flex items-center rounded-full border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-[#122A16] dark:text-emerald-400 mb-1">
            REAL APPLICATION & TEXTURE
          </span>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#122A16] dark:text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>SEE IT IN ACTION</span>
          </h3>
        </div>
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Tap to watch →
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 2. 9:15 PORTRAIT HORIZONTAL VIDEO REEL STRIP                              */}
      {/* ========================================================================= */}
      <div
        className="flex gap-3.5 overflow-x-auto overflow-y-hidden pb-2 no-scrollbar scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {parsedReels.map((reel, idx) => (
          <div
            key={`action-reel-card-${reel.id}`}
            onClick={() => openStory(idx)}
            className="group relative flex-shrink-0 w-[125px] sm:w-[135px] aspect-[9/15] rounded-[20px] overflow-hidden bg-black border border-black/10 dark:border-white/10 shadow-xs cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[#122A16] dark:hover:border-emerald-400 hover:shadow-lg hover:shadow-[#122A16]/15 select-none"
          >
            {/* Reel Poster Image */}
            <Image
              src={reel.posterUrl}
              alt={reel.title}
              fill
              sizes="(max-width: 640px) 125px, 135px"
              className="object-cover object-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
            />

            {/* Top Creator Badge */}
            {reel.creator && (
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/45 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#CDE6B4] text-[#122A16] text-[8px] font-extrabold">
                  {reel.avatarText || 'M'}
                </span>
                <span className="truncate max-w-[65px]">{reel.creator}</span>
              </div>
            )}

            {/* Center Play Icon Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#122A16] backdrop-blur-sm shadow-md transition-all duration-300 group-hover:scale-115 group-hover:bg-white">
              <Play size={14} className="fill-current ml-0.5" />
            </div>

            {/* Bottom Title Gradient */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 pt-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
              <p className="text-[11px] font-bold text-white leading-tight drop-shadow-xs truncate">
                {reel.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. FULLSCREEN / POPUP IMMERSIVE STORY PLAYER MODAL                        */}
      {/* ========================================================================= */}
      {isStoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Story Video Reel Player"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in-0 duration-200"
          onClick={closeStory}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Modal Container */}
          <div
            className="relative w-full max-w-[380px] h-[85vh] max-h-[660px] bg-black rounded-[28px] overflow-hidden shadow-2xl border border-white/15 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Story Progress Bars */}
            <div className="absolute top-3.5 inset-x-3.5 z-20 flex gap-1.5">
              {parsedReels.map((_, i) => (
                <div
                  key={`story-prog-${i}`}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{
                      width:
                        i < activeStoryIndex
                          ? '100%'
                          : i === activeStoryIndex
                          ? `${progress}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Top Creator Info & Controls */}
            <div className="absolute top-7 inset-x-3.5 z-20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-xs font-bold drop-shadow-md">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#CDE6B4] text-[#122A16] text-[9px] font-extrabold">
                  {currentReel.avatarText || 'M'}
                </span>
                <span>{currentReel.creator || '@minsahbeauty'}</span>
                <span className="text-[10px] text-white/70 font-normal">• Verified</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Play / Pause Toggle */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPaused ? 'Resume video' : 'Pause video'}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
                >
                  {isPaused ? <Play size={12} className="fill-current ml-0.5" /> : <Pause size={12} className="fill-current" />}
                </button>

                {/* Mute / Unmute Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={closeStory}
                  aria-label="Close story player"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Video / Visual Media Frame */}
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              {currentReel.videoUrl ? (
                <video
                  ref={videoRef}
                  src={currentReel.videoUrl}
                  poster={currentReel.posterUrl}
                  playsInline
                  autoPlay
                  muted={isMuted}
                  loop
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={currentReel.posterUrl}
                  alt={currentReel.title}
                  fill
                  priority
                  sizes="380px"
                  className="object-cover object-center"
                />
              )}
            </div>

            {/* Left / Right Tap Navigation Zones */}
            <div
              className="absolute top-16 bottom-24 left-0 w-1/3 z-10 cursor-pointer"
              onClick={prevStory}
              aria-label="Previous story"
            />
            <div
              className="absolute top-16 bottom-24 right-0 w-1/3 z-10 cursor-pointer"
              onClick={nextStory}
              aria-label="Next story"
            />

            {/* In-Video "Quick Add to Cart / Order Now" Floating Capsule */}
            <div className="absolute bottom-4 inset-x-3.5 z-20 p-2.5 px-3 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  <Image
                    src={productImage}
                    alt={productName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                    {productName}
                  </p>
                  <p className="text-xs font-mono font-extrabold text-[#122A16] dark:text-emerald-400">
                    ৳ {productPrice.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOrderFromStory}
                className="flex items-center gap-1.5 rounded-full bg-[#122A16] hover:bg-[#0c1d0f] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white px-3.5 py-2 text-[11px] font-bold tracking-wide shadow-md active:scale-95 transition-all shrink-0 ml-2"
              >
                <ShoppingBag size={12} />
                <span>ORDER NOW</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
