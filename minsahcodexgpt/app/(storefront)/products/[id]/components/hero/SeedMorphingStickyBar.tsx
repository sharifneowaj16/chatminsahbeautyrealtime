'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ShoppingBag, ArrowRight, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';

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

  // Scroll listener detecting when user scrolls past the primary hero section
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const isMobile = window.innerWidth < 768;
          // Trigger threshold: Mobile ~800px, Desktop ~700px
          const threshold = isMobile ? 800 : 700;

          setIsVisible(scrollY >= threshold);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

  return (
    <div
      aria-hidden={!isVisible}
      className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-8 opacity-0 pointer-events-none'
      } bottom-[calc(16px+env(safe-area-inset-bottom,0px))] md:bottom-5 w-[calc(100%-24px)] md:w-auto md:min-w-[420px] md:max-w-[480px] ${className}`}
    >
      {/* 
        Seed.com DOM Structure:
        <div class="styles__Wrapper-sc-e29aa0d5-0">
          <div class="styles__MotionPillBackground-sc-e29aa0d5-1" />
          <div class="styles__DynamicElementsRow-sc-e29aa0d5-2">
            <img class="styles__ProductImage-sc-e29aa0d5-3" />
            <span class="styles__TitleMask-sc-e29aa0d5-4">...</span>
            <div class="styles__CTAWrapper-sc-e29aa0d5-8">
              <button class="styles__ButtonWrapper-sc-a309a1f4-1" />
            </div>
          </div>
        </div>
      */}
      <div className="relative overflow-hidden rounded-full bg-[#163020]/92 backdrop-blur-xl saturate-180 border border-white/15 shadow-[0px_10px_30px_rgba(0,0,0,0.35)] p-1.5 md:p-2">
        
        {/* Dynamic Inner Row */}
        <div className="flex items-center justify-between gap-2.5 md:gap-3.5 pl-1.5 pr-1">
          
          {/* Left: Product Thumbnail Image */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative h-9 w-9 md:h-10 md:w-10 rounded-full overflow-hidden bg-white/10 p-0.5 border border-white/10 shrink-0">
              <Image
                src={productImage || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80'}
                alt={productName}
                fill
                sizes="40px"
                className="object-contain rounded-full"
              />
            </div>

            {/* Middle: Title Mask & Animated Word Mask */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 overflow-hidden">
                {titleWords.map((word, idx) => (
                  <span
                    key={`${word}-${idx}`}
                    className="text-xs md:text-sm font-semibold text-white tracking-tight leading-none"
                  >
                    {word}
                  </span>
                ))}
              </div>

              {/* Price & Status Sub-line */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] md:text-xs font-bold text-[#D4F6A2] leading-none">
                  ৳{price.toLocaleString('bn-BD')}
                </span>
                {compareAtPrice && compareAtPrice > price && (
                  <span className="text-[10px] text-white/50 line-through leading-none">
                    ৳{compareAtPrice.toLocaleString('bn-BD')}
                  </span>
                )}
                <span className="text-white/30 text-[9px]">•</span>
                <span className="text-[10px] text-white/80 font-medium">
                  {inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Solid White High-Contrast CTA Button (Triggers Cart Drawer) */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleCtaClick}
              disabled={!inStock || isAdding}
              className={`group flex items-center justify-center gap-1.5 h-9 md:h-10 px-4 md:px-5 rounded-full bg-white hover:bg-white/95 text-[#163020] text-xs md:text-sm font-bold shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap`}
              aria-label="Start Order and Open Cart"
            >
              {isAdding ? (
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-emerald-700 animate-bounce" />
                  <span>Added!</span>
                </span>
              ) : (
                <>
                  <span>Start Now</span>
                  <ArrowRight size={13} className="text-[#163020] group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
