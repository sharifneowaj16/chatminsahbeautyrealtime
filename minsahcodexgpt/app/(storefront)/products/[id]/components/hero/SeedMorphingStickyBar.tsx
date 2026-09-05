'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { safeImageUrl } from '@/lib/safe-image';

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

      // Top Sentinel check
      if (!bundleBtn) {
        setIsVisible(false);
        return;
      }

      const bundleRect = bundleBtn.getBoundingClientRect();

      // Rule 1: Strictly BELOW the bundle button.
      // If bundleRect.bottom > 0, button is visible or below viewport (user is at or above button).
      // When scrolling down, button leaves viewport top -> bundleRect.bottom <= 0
      // When scrolling up, button re-enters from top -> bundleRect.bottom > 0 -> HIDE immediately!
      const isPastBundle = bundleRect.bottom <= 0;
      if (!isPastBundle) {
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
  // 0 = hidden: bar is off-screen / collapsed
  // 1 = icon: small circular badge popped in at bottom-right (Image 1)
  // 2 = expanding: bubble morphs & expands from right-to-left into bottom-centered capsule (Image 2)
  // 3 = text: product title words, price & stock status unmask and slide in
  // 4 = ready: "Start Now" button scales in with spring bounce, full bar interactive
  const [animStage, setAnimStage] = useState<0 | 1 | 2 | 3 | 4>(0);

  // Staggered choreography when visibility changes (600ms expansion flow)
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    if (isVisible) {
      // Phase 1: Circular product icon appears at bottom right
      setAnimStage(1);

      // Phase 2: Bar begins expanding over 600ms from right to left
      t1 = setTimeout(() => {
        setAnimStage(2);
      }, 350);

      // Phase 3: Text & pricing reveals smoothly inside the expanding pill
      t2 = setTimeout(() => {
        setAnimStage(3);
      }, 680);

      // Phase 4: CTA button pops in with spring as expansion reaches full width
      t3 = setTimeout(() => {
        setAnimStage(4);
      }, 950);
    } else {
      // User scrolled out of trigger zone -> clean, immediate reverse collapse
      setAnimStage(0);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
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
      // Add item to cart context
      addItem({
        id: variantId ? `${productId}-${variantId}` : productId,
        productId: productId,
        name: productName,
        price: price,
        image: productImage,
        quantity: 1,
        variantId: variantId || undefined,
        variantName: variantName || undefined,
        sku: sku || undefined,
      });

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

  // Outer container positioning style for multi-phase morphing animation
  // Desktop: Anchored to Bottom-Right (Seed.com alignment with Left Gap)
  // Mobile: Centered at bottom for comfortable thumb reach
  const containerStyle: React.CSSProperties = useMemo(() => {
    if (animStage === 0) {
      return {
        opacity: 0,
        pointerEvents: 'none',
        transform: isDesktop ? 'translateY(24px) scale(0.9)' : 'translate(-50%, 24px) scale(0.9)',
        width: '64px',
        height: '64px',
        right: isDesktop ? '28px' : 'auto',
        left: isDesktop ? 'auto' : '50%',
        transition: 'opacity 220ms ease, transform 220ms ease',
      };
    }

    if (animStage === 1) {
      // Phase 1: 64px circular orb at the bottom-right (Image 1)
      return {
        opacity: 1,
        pointerEvents: 'auto',
        transform: 'translateY(0) scale(1)',
        width: '64px',
        height: '64px',
        right: isDesktop ? '28px' : '16px',
        left: isDesktop ? 'auto' : 'auto',
        transition:
          'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1), width 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease, scale 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    }

    // Phase 2, 3, 4: Full expanded 480 * 64 capsule
    // Desktop: Right-anchored (leaves clean Left Gap across the viewport matching Seed.com)
    // Mobile: Full-width centered up to 480px
    if (isDesktop) {
      return {
        opacity: 1,
        pointerEvents: 'auto',
        transform: 'translateY(0) scale(1)',
        right: '28px',
        left: 'auto',
        width: '480px',
        height: '64px',
        transition:
          'width 600ms cubic-bezier(0.16, 1, 0.3, 1), height 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease, transform 350ms ease',
      };
    }

    // Mobile: Centered
    return {
      opacity: 1,
      pointerEvents: 'auto',
      left: '50%',
      right: 'auto',
      transform: 'translateX(-50%) scale(1)',
      width: 'calc(100vw - 24px)',
      maxWidth: '480px',
      height: '64px',
      transition:
        'width 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1), height 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease',
    };
  }, [animStage, isDesktop]);

  return (
    <div
      aria-hidden={animStage === 0}
      style={containerStyle}
      className={`
        fixed z-50
        bottom-[calc(16px+env(safe-area-inset-bottom,0px))] md:bottom-6
        ${className}
      `}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-full bg-[#575e5559] backdrop-blur-2xl saturate-180 border border-white/20 shadow-[0px_12px_36px_rgba(0,0,0,0.22)] p-2"
        onClick={animStage === 1 ? handleCtaClick : undefined}
      >
        {/* Dynamic Inner Row */}
        <div className="h-full w-full flex items-center justify-between gap-3">
          {/* Left: Product Thumbnail Image (Glides smoothly with the expanding left edge) */}
          <div className="relative h-12 w-12 rounded-full overflow-hidden bg-white/20 p-0.5 border border-white/25 shrink-0">
            <Image
              src={safeImageUrl(productImage)}
              alt={productName}
              fill
              sizes="48px"
              className="object-contain rounded-full"
            />
          </div>

          {/* Middle: Product Name Only (#1c3a13 dark forest text) */}
          <div
            className={`
              flex-1 min-w-0 px-2.5 overflow-hidden transition-all duration-300 ease-out
              ${
                animStage >= 3
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-3 pointer-events-none'
              }
            `}
          >
            <span
              style={{
                fontFamily: '"Seed Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 500,
              }}
              className="block text-sm md:text-base text-[#1c3a13] tracking-tight leading-snug truncate"
            >
              {productName}
            </span>
          </div>

          {/* Right: Solid White High-Contrast CTA Button (Exact 120px * 48px) */}
          <div
            className={`
              shrink-0 flex-none transition-all duration-300 cubic-bezier(0.34,1.56,0.64,1)
              ${
                animStage >= 4
                  ? 'opacity-100 scale-100 overflow-visible w-[120px]'
                  : 'opacity-0 scale-75 max-w-0 overflow-hidden pointer-events-none'
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
              className="group flex items-center justify-center gap-1.5 w-[120px] h-[48px] rounded-full bg-white hover:bg-white/95 text-[#1c3a13] text-xs md:text-sm tracking-tight shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              aria-label="Start Order and Open Cart"
            >
              {isAdding ? (
                <span className="flex items-center gap-1">
                  <Check size={16} className="text-emerald-700 animate-bounce" />
                  <span>Added!</span>
                </span>
              ) : (
                <span>Start Now</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
