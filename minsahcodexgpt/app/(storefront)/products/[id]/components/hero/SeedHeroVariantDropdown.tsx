'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { ChevronDown, Check } from 'lucide-react';
import { extractVariantAttributes } from '@/utils/cartItemHelper';
import { safeImageUrl } from '@/lib/safe-image';

export interface ProductVariantItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  attributes?: Record<string, string> | null;
  image?: string | null;
}

export interface SeedHeroVariantDropdownProps {
  variants?: ProductVariantItem[];
  selectedVariantId: string | null;
  defaultImage?: string;
  galleryImages?: string[];
  onVariantChange: (variantId: string | null, price: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
  onHoverImage?: (imageUrl: string | null) => void;
  onSelectVariant?: (variant: ProductVariantItem) => void;
  onOpenChange?: (isOpen: boolean) => void;
  compact?: boolean;
  className?: string;
}

export function getVariantSize(v: ProductVariantItem): string | null {
  const attrs = extractVariantAttributes(v.attributes, v.name);
  if (attrs.size) return attrs.size;
  if (attrs.volume) return attrs.volume;
  if (v.name) {
    if (v.name.includes('30*2') || v.name.toLowerCase().includes('30ml')) return '30*2 ml';
    if (v.name.includes('80*2') || v.name.toLowerCase().includes('80ml')) return '80*2 ml';
    const match = v.name.match(/\b(\d+(?:\*\d+)?\s*(?:ml|g|oz|kg|l|pcs?|pack))\b/i);
    if (match) return match[1].trim();
  }
  return null;
}

export function getVariantShadeName(v: ProductVariantItem): string {
  if (v.attributes && typeof v.attributes === 'object') {
    const shadeKeys = ['shade', 'Shade', 'shadeName', 'color', 'Color', 'colour', 'tone', 'formulation'];
    for (const key of shadeKeys) {
      if (v.attributes[key]) {
        return String(v.attributes[key]).trim();
      }
    }
  }
  return v.name || 'Default';
}

export default function SeedHeroVariantDropdown({
  variants = [],
  selectedVariantId,
  defaultImage = '/images/categories/Skincare.png',
  galleryImages = [],
  onVariantChange,
  onImageChange,
  onHoverImage,
  onSelectVariant,
  onOpenChange,
  compact = false,
  className = '',
}: SeedHeroVariantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to resolve variant image with gallery image fallback
  const resolveVariantImage = (v: ProductVariantItem, index: number): string => {
    if (v.image && v.image.trim() !== '') return v.image;
    if (galleryImages && galleryImages.length > index && galleryImages[index]) {
      return galleryImages[index];
    }
    const shadeName = (v.name || '').toLowerCase();
    if (shadeName.includes('ivory')) return defaultImage || '/images/categories/Makeup.png';
    if (shadeName.includes('beige')) return '/images/categories/Skincare.png';
    if (shadeName.includes('sand')) return '/images/categories/Sunscreen.png';
    if (index === 0) return defaultImage || '/images/categories/Makeup.png';
    if (index === 1) return '/images/categories/Skincare.png';
    if (index === 2) return '/images/categories/Sunscreen.png';
    return defaultImage || '/images/categories/Skincare.png';
  };

  // Active variant resolution
  const activeVariant = useMemo(() => {
    return (
      variants.find((v) => v.id === selectedVariantId) ||
      (variants.length > 0 ? variants[0] : null)
    );
  }, [variants, selectedVariantId]);

  const activeIndex = useMemo(() => {
    if (!activeVariant) return 0;
    const idx = variants.findIndex((v) => v.id === activeVariant.id);
    return idx >= 0 ? idx : 0;
  }, [variants, activeVariant]);

  const activeSize = useMemo(() => {
    return activeVariant ? getVariantSize(activeVariant) : null;
  }, [activeVariant]);

  // The permanent locked image of the active selected variant
  const lockedImage = useMemo(() => {
    if (!activeVariant) return defaultImage || null;
    return resolveVariantImage(activeVariant, activeIndex);
  }, [activeVariant, activeIndex, defaultImage, galleryImages]);

  // Pre-warm / preload all variant images for instant zero-latency hover preview
  useEffect(() => {
    if (!isOpen || !variants || variants.length === 0) return;
    variants.forEach((v, idx) => {
      const src = resolveVariantImage(v, idx);
      if (src && typeof window !== 'undefined') {
        const img = new window.Image();
        img.src = src;
      }
    });
  }, [isOpen, variants, galleryImages, defaultImage]);

  // Restore Hero Gallery to the locked variant image
  const restoreLockedImage = () => {
    if (onHoverImage) {
      onHoverImage(null);
    } else if (onImageChange) {
      onImageChange(lockedImage);
    }
  };

  const closeDropdown = () => {
    restoreLockedImage();
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (!next) {
        restoreLockedImage();
      }
      onOpenChange?.(next);
      return next;
    });
  };

  // Click outside / Esc key handler
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lockedImage]);

  // Mouse leave handler for option list
  const handleMouseLeaveList = () => {
    restoreLockedImage();
  };

  // Live hover preview handler
  const handleItemMouseEnter = (v: ProductVariantItem, idx: number) => {
    const targetImg = resolveVariantImage(v, idx);
    if (onHoverImage) {
      onHoverImage(targetImg);
    } else if (onImageChange) {
      onImageChange(targetImg);
    }
  };

  // Handler for selecting a variant
  const handleSelectVariant = (targetVar: ProductVariantItem, idx: number) => {
    closeDropdown();
    onVariantChange(targetVar.id, targetVar.price, targetVar.stock ?? 100);
    const selectedImg = resolveVariantImage(targetVar, idx);
    if (onImageChange) {
      onImageChange(selectedImg);
    }
    if (onHoverImage) {
      onHoverImage(selectedImg);
    }
    if (onSelectVariant) {
      onSelectVariant(targetVar);
    }
  };

  if (!variants || variants.length <= 1) {
    return null;
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {!compact && (
        <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
          <span className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-[11px]">
            Select Formulation &amp; Size
          </span>
          <span className="font-mono text-xs font-bold text-[#1c3a13] dark:text-emerald-400">
            {variants.length} Options
          </span>
        </div>
      )}

      {/* Collapsed Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select variant. Currently: ${activeVariant ? getVariantShadeName(activeVariant) : 'Default'}`}
        className={`w-full ${
          compact
            ? 'h-7.5 sm:h-8 px-2.5 sm:px-3 rounded-full'
            : 'h-12 sm:h-[50px] px-3 sm:px-3.5 rounded-2xl'
        } flex items-center justify-between gap-1.5 sm:gap-2.5 border bg-white dark:bg-zinc-800/90 text-left transition-all shadow-2xs cursor-pointer select-none ${
          isOpen
            ? 'border-[#1c3a13] ring-2 ring-[#1c3a13]/20 dark:border-emerald-400 dark:ring-emerald-400/30'
            : 'border-[#1c3a13]/20 dark:border-white/12 hover:border-[#1c3a13] dark:hover:border-white/30'
        }`}
      >
        {/* Left: Thumbnail Image + Variant Shade Name + Size Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <div
            className={`relative ${
              compact ? 'h-5 w-5 sm:h-6 sm:w-6 rounded-full' : 'h-7 w-7 sm:h-8 sm:w-8 rounded-lg'
            } overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800 aspect-square`}
          >
            <Image
              src={safeImageUrl(activeVariant ? resolveVariantImage(activeVariant, activeIndex) : defaultImage)}
              alt={activeVariant?.name || 'Variant thumbnail'}
              fill
              sizes={compact ? '24px' : '32px'}
              className="object-cover"
            />
          </div>
          <span
            className={`${
              compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-[13.5px]'
            } font-bold text-[#181C1A] dark:text-white truncate`}
          >
            {activeVariant ? getVariantShadeName(activeVariant) : 'Select a variant'}
          </span>
          {activeSize && (
            <span
              className={`shrink-0 ${
                compact
                  ? 'px-1.5 py-0.5 text-[9px] sm:text-[10px]'
                  : 'px-2 py-0.5 text-[10px] sm:text-[11px]'
              } rounded-md bg-stone-100 dark:bg-zinc-700/80 font-mono font-medium text-stone-600 dark:text-stone-300 leading-none`}
            >
              {activeSize}
            </span>
          )}
        </div>

        {/* Right: Price + Animated Chevron */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-1">
          <span
            className={`font-inter font-bold ${
              compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-[13.5px]'
            } text-[#1c3a13] dark:text-emerald-400`}
          >
            ৳{Math.round(activeVariant?.price ?? 0)}
          </span>
          <ChevronDown
            size={compact ? 12 : 15}
            className={`text-stone-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#1c3a13] dark:text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Luxury Vertical Track Dropdown with iOS Momentum Scrollbar */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available variants"
          className={`absolute left-0 right-0 ${
            compact ? 'top-[calc(100%+4px)]' : 'top-full mt-2'
          } z-50 w-full rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          <div
            className={`${
              compact ? 'text-[9px] px-2.5 py-1.5' : 'text-[10px] px-3.5 py-2'
            } uppercase font-bold text-stone-400 dark:text-stone-500 tracking-wider bg-stone-50/80 dark:bg-zinc-800/40 border-b border-stone-100 dark:border-white/5 flex items-center justify-between`}
          >
            <span>Available Formulations &amp; Sizes</span>
            <span className="font-mono text-stone-500">{variants.length} Options</span>
          </div>

          <div
            onMouseLeave={handleMouseLeaveList}
            className={`${
              compact ? 'max-h-48 sm:max-h-56' : 'max-h-64 sm:max-h-72'
            } overflow-y-auto divide-y divide-stone-100 dark:divide-white/5 py-1 scroll-smooth ios-scrollbar pr-1`}
          >
            {variants.map((v, idx) => {
              const isSelected = v.id === selectedVariantId;
              const isOOS = v.stock !== undefined && v.stock <= 0;
              const vSize = getVariantSize(v);
              const vShade = getVariantShadeName(v);
              const vImage = resolveVariantImage(v, idx);

              return (
                <button
                  key={`hero-var-${v.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isOOS}
                  onClick={() => handleSelectVariant(v, idx)}
                  onMouseEnter={() => handleItemMouseEnter(v, idx)}
                  className={`w-full ${
                    compact ? 'px-2 py-2 sm:px-2.5 sm:py-2.5' : 'px-3 py-2.5 sm:px-3.5 sm:py-3'
                  } flex items-center justify-between gap-2 sm:gap-3 text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#E5EAE1] dark:bg-emerald-950/40 text-[#1c3a13] dark:text-emerald-200 font-medium'
                      : isOOS
                      ? 'opacity-40 cursor-not-allowed bg-stone-50/40 dark:bg-zinc-800/30'
                      : 'hover:bg-stone-100/75 dark:hover:bg-zinc-800/80 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {/* Left: Thumbnail + Shade + Size */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`relative ${
                        compact ? 'h-7 w-7 sm:h-8 sm:w-8 rounded-lg' : 'h-9 w-9 sm:h-10 sm:w-10 rounded-xl'
                      } overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800`}
                    >
                      {vImage ? (
                        <Image
                          src={safeImageUrl(vImage)}
                          alt={v.name}
                          fill
                          sizes={compact ? '32px' : '40px'}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-stone-500">
                          {v.name.slice(0, 3)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`${
                          compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                        } font-bold truncate leading-tight`}
                      >
                        {vShade}
                      </p>
                      <div
                        className={`flex items-center gap-1.5 ${
                          compact ? 'text-[10px]' : 'text-[11px]'
                        } text-stone-500 dark:text-stone-400 mt-0.5`}
                      >
                        {vSize && <span className="font-mono">Size: {vSize}</span>}
                        {vSize && <span>•</span>}
                        <span
                          className={
                            isOOS
                              ? 'text-rose-500 font-medium'
                              : 'text-emerald-700 dark:text-emerald-400 font-medium'
                          }
                        >
                          {isOOS ? 'Sold out' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Check */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span
                      className={`font-inter font-bold ${
                        compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                      } text-[#1c3a13] dark:text-emerald-400`}
                    >
                      ৳{Math.round(v.price)}
                    </span>
                    {isSelected && (
                      <div
                        className={`flex ${
                          compact ? 'h-4 w-4' : 'h-5 w-5'
                        } items-center justify-center rounded-full bg-[#1c3a13] dark:bg-emerald-400 text-white dark:text-zinc-950 shadow-2xs`}
                      >
                        <Check size={compact ? 9 : 11} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

