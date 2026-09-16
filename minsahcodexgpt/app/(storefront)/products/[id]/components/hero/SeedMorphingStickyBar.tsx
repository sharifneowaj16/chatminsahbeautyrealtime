'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { safeImageUrl } from '@/lib/safe-image';
import { createStandardCartItem } from '@/utils/cartItemHelper';
import { cleanProductName } from './cleanProductName';

export interface SeedMorphingStickyBarProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  compareAtPrice?: number | null;
  sku?: string | null;
  variantId?: string | null;
  variantName?: string | null;
  inStock?: boolean;
  quantity?: number;
  className?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * SeedMorphingStickyBar
 * ──────────────────────────────────────────────────────────────────────────
 * Premium bottom sticky pill bar — Seed.com-inspired design.
 *
 * Trigger:
 *   The pill is hidden while the "ADD 2-STEP BUNDLE TO BAG" button (inside
 *   SeedHeroBundleCard) is visible in the viewport. Once the user scrolls
 *   past it and the button leaves the viewport, the pill slides in from
 *   the RIGHT side with a premium spring animation.
 *
 * Visibility:
 *   Stays fixed at the bottom of the viewport from that point until the
 *   user scrolls all the way to the bottom of the page.
 *
 * Desktop Only:
 *   Slide-from-right animation. Mobile: slide-from-bottom (natural thumb reach).
 *
 * Detection:
 *   Uses IntersectionObserver on the BundleCard CTA button (sentinel) instead
 *   of a fragile fixed scrollY threshold.
 * ──────────────────────────────────────────────────────────────────────── */

export default function SeedMorphingStickyBar({
  productId,
  productName,
  productImage,
  price,
  compareAtPrice,
  sku = 'DS-01®',
  variantId,
  variantName,
  inStock = true,
  quantity = 1,
  className = '',
}: SeedMorphingStickyBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();
  const { openDrawer } = useCartDrawer();

  // Detect bidirectional scroll boundaries:
  // 1. Top Boundary: Appears ONLY after scrolling past "ADD 2-STEP BUNDLE TO BAG" button
  //    (hidden when at or above the button; hides as soon as button re-enters viewport)
  // 2. Bottom Boundary: Hides when reaching the end of reviews section or approaching footer
  //    (re-appears when scrolling back up past footer into lower reviews section)
  useEffect(() => {
    let ticking = false;
    let bundleBtn: Element | null = null;
    let footerEl: Element | null = null;
    let reviewSectionEl: Element | null = null;

    const findElements = () => {
      if (!bundleBtn || !bundleBtn.isConnected) {
        bundleBtn =
          document.querySelector('[data-sticky-sentinel="bundle-cta"]') ||
          Array.from(document.querySelectorAll('button')).find((btn) =>
            btn.textContent?.includes('ADD 2-STEP BUNDLE')
          ) ||
          null;
      }
      if (!footerEl || !footerEl.isConnected) {
        footerEl = document.querySelector('footer');
      }
      if (!reviewSectionEl || !reviewSectionEl.isConnected) {
        reviewSectionEl = document.getElementById('reviews-section');
      }
    };

    const updateVisibility = () => {
      findElements();

      // Top Sentinel check: appear after scrolling past top hero buy area
      const heroEl = document.querySelector('[aria-label="Product Hero Section"]') || document.querySelector('h1');
      if (heroEl) {
        const heroRect = heroEl.getBoundingClientRect();
        if (heroRect.bottom > 200) {
          setIsVisible(false);
          return;
        }
      } else if (window.scrollY < 400) {
        setIsVisible(false);
        return;
      }

      // Rule 2: Bottom Boundary — Footer Top
      // Hide before footer top touches or enters the viewport
      if (footerEl) {
        const footerRect = footerEl.getBoundingClientRect();
        if (footerRect.top <= window.innerHeight + 24) {
          setIsVisible(false);
          return;
        }
      }

      // Rule 3: Bottom Boundary — End of Reviews Section
      // Hide when user reaches the end / scrolls past the reviews section
      if (reviewSectionEl) {
        const reviewRect = reviewSectionEl.getBoundingClientRect();
        if (reviewRect.bottom <= window.innerHeight) {
          setIsVisible(false);
          return;
        }
      }

      // Between the bottom of bundle CTA and end of reviews / top of footer: SHOW
      setIsVisible(true);
    };

    const handleScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateVisibility();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Immediate calculation + hydration buffer timers
    updateVisibility();
    const t1 = setTimeout(updateVisibility, 150);
    const t2 = setTimeout(updateVisibility, 500);

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Animation Stage:
  // 0 = hidden: bar glides downward out of view
  // 1 = icon: small circular badge popped in with spring
  // 2 = expanding: fluidly morphs from circle into full-width capsule
  // 3 = ready: product title & CTA button effortlessly fade and scale in
  const [animStage, setAnimStage] = useState<0 | 1 | 2 | 3>(0);

  // Fluid iOS choreography when visibility changes (~420ms total)
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;

    if (isVisible) {
      // Step 1 (0ms): Icon bubble appears
      setAnimStage(1);

      // Step 2 (140ms): Fluidly morphs and expands from circle to capsule
      t1 = setTimeout(() => {
        setAnimStage(2);
      }, 140);

      // Step 3 (240ms): Product title and CTA button effortlessly slide & fade into place
      t2 = setTimeout(() => {
        setAnimStage(3);
      }, 240);
    } else {
      // When scrolling back up, gracefully glide down out of view in one fluid motion
      setAnimStage(0);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isVisible]);

  // Split product title words for Seed-style Staggered WordMask
  const titleWords = useMemo(() => {
    const clean = productName.replace(/\s+/g, ' ').trim();
    return clean.split(' ').slice(0, 3); // Top 3 keywords
  }, [productName]);

  // Handle 1-Click CTA click
  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inStock || isAdding) return;

    setIsAdding(true);

    try {
      // Add item to cart context using canonical factory
      const cartItem = createStandardCartItem({
        product: {
          id: productId,
          name: productName,
          price: price,
          image: productImage,
          sku: sku || undefined,
        },
        variant: variantId
          ? {
            id: variantId,
            name: variantName,
            price: price,
            image: productImage,
            sku: sku || undefined,
          }
          : null,
        quantity: quantity || 1,
      });

      addItem(cartItem);

      // Directly open Cart Drawer as requested by user
      openDrawer();

      // Micro haptic feedback if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    } catch (err) {
      console.error('Failed to add to cart from sticky capsule:', err);
    } finally {
      setTimeout(() => setIsAdding(false), 600);
    }
  };

  // Responsive detection: Desktop vs Mobile
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Outer container positioning style with GPU layer acceleration & fluid spring curves
  // Desktop: Anchored to Bottom-Right, elevated to bottom: 38px
  // Mobile: Centered at bottom, elevated to bottom: 28px with 20px left/right margins (width: calc(100vw - 40px))
  const containerStyle: React.CSSProperties = useMemo(() => {
    const bottomPos = isDesktop ? '38px' : 'calc(28px + env(safe-area-inset-bottom, 0px))';

    const gpuProps = {
      willChange: 'transform, opacity, width',
      WebkitBackfaceVisibility: 'hidden' as const,
      backfaceVisibility: 'hidden' as const,
    };

    if (animStage === 0) {
      return {
        ...gpuProps,
        opacity: 0,
        pointerEvents: 'none',
        bottom: bottomPos,
        transform: isDesktop ? 'translate3d(0, 32px, 0) scale(0.95)' : 'translate3d(-50%, 32px, 0) scale(0.95)',
        width: isDesktop ? '480px' : 'calc(100vw - 40px)',
        maxWidth: isDesktop ? '480px' : '440px',
        height: isDesktop ? '64px' : '56px',
        right: isDesktop ? 'max(32px, calc((100vw - 1440px) / 2 + 32px))' : 'auto',
        left: isDesktop ? 'auto' : '50%',
        transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease',
      };
    }

    if (animStage === 1) {
      // Phase 1: circular orb at bottom right
      return {
        ...gpuProps,
        opacity: 1,
        pointerEvents: 'auto',
        bottom: bottomPos,
        transform: isDesktop ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(-50%, 0, 0) scale(1)',
        width: isDesktop ? '64px' : '56px',
        height: isDesktop ? '64px' : '56px',
        maxWidth: isDesktop ? '64px' : '56px',
        right: isDesktop ? 'max(32px, calc((100vw - 1440px) / 2 + 32px))' : 'auto',
        left: isDesktop ? 'auto' : '50%',
        transition:
          'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
      };
    }

    // Phase 2, 3: Full expanded capsule
    if (isDesktop) {
      return {
        ...gpuProps,
        opacity: 1,
        pointerEvents: 'auto',
        bottom: '38px',
        transform: 'translate3d(0, 0, 0) scale(1)',
        right: 'max(32px, calc((100vw - 1440px) / 2 + 32px))',
        left: 'auto',
        width: '480px',
        maxWidth: '480px',
        height: '64px',
        transition:
          'width 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
      };
    }

    // Mobile: Centered with increased left, right and bottom margins
    return {
      ...gpuProps,
      opacity: 1,
      pointerEvents: 'auto',
      bottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      right: 'auto',
      transform: 'translate3d(-50%, 0, 0) scale(1)',
      width: 'calc(100vw - 40px)',
      maxWidth: '440px',
      height: '56px',
      transition:
        'width 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease',
    };
  }, [animStage, isDesktop]);

  return (
    <div
      aria-hidden={animStage === 0}
      style={containerStyle}
      className={`fixed z-50 ${className}`}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-full bg-[rgba(20,26,18,0.78)] dark:bg-[rgba(10,14,10,0.85)] backdrop-blur-2xl saturate-190 border border-white/25 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.32),inset_0_-1px_1px_0_rgba(0,0,0,0.25)] p-1.5 md:p-2"
        onClick={animStage === 1 ? handleCtaClick : undefined}
      >
        {/* Dynamic Inner Row */}
        <div className="h-full w-full flex items-center justify-between gap-2.5 md:gap-3">
          {/* Left: Product Thumbnail Image */}
          <div className="relative h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden bg-white/20 p-0.5 border border-white/25 shrink-0 aspect-square">
            <Image
              src={safeImageUrl(productImage)}
              alt={productName}
              fill
              sizes="48px"
              className="object-contain rounded-full"
            />
          </div>

          {/* Middle: Product Name */}
          <div
            className={`
              flex-1 min-w-0 px-1.5 md:px-2.5 overflow-hidden transition-all duration-300 cubic-bezier(0.22, 1, 0.36, 1)
              ${animStage >= 3
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-1.5 pointer-events-none'
              }
            `}
          >
            <span
              style={{
                fontFamily: '"Seed Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 500,
                color: '#fcfcf7',
              }}
              className="block text-xs md:text-sm lg:text-base text-[#fcfcf7] tracking-tight leading-snug truncate"
            >
              {cleanProductName(productName)}
            </span>
          </div>

          {/* Right: Solid White High-Contrast CTA Button (No Layout Thrash) */}
          <div
            className={`
              shrink-0 flex-none transition-all duration-350 cubic-bezier(0.22, 1, 0.36, 1)
              ${animStage >= 3
                ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
                : 'opacity-0 scale-90 translate-x-2 pointer-events-none'
              }
            `}
          >
            <button
              type="button"
              onClick={handleCtaClick}
              disabled={!inStock || isAdding}
              style={{
                fontFamily: '"Seed Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 650,
              }}
              className="group flex items-center justify-center gap-1.5 px-3.5 md:px-5 min-w-[96px] md:min-w-[120px] h-[40px] md:h-[48px] rounded-full bg-white hover:bg-stone-100 text-[#1c3a13] font-bold text-xs md:text-sm tracking-tight shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              aria-label="Add to Cart and Open Drawer"
            >
              {isAdding ? (
                <span className="flex items-center gap-1">
                  <Check size={16} className="text-emerald-700 animate-bounce" />
                  <span>Added!</span>
                </span>
              ) : (
                <span>Add to Cart</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
