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
  onVariantChange: (variantId: string | null, price: number, stock: number) => void;
  onImageChange?: (imageUrl: string | null) => void;
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
  onVariantChange,
  onImageChange,
  className = '',
}: SeedHeroVariantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active variant resolution
  const activeVariant = useMemo(() => {
    return (
      variants.find((v) => v.id === selectedVariantId) ||
      (variants.length > 0 ? variants[0] : null)
    );
  }, [variants, selectedVariantId]);

  const activeSize = useMemo(() => {
    return activeVariant ? getVariantSize(activeVariant) : null;
  }, [activeVariant]);

  // Click outside / Esc key handler
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
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
  }, [isOpen]);

  // Handler for selecting a variant
  const handleSelectVariant = (targetVar: ProductVariantItem) => {
    setIsOpen(false);
    onVariantChange(targetVar.id, targetVar.price, targetVar.stock ?? 100);
    if (onImageChange) {
      onImageChange(targetVar.image || null);
    }
  };

  if (!variants || variants.length <= 1) {
    return null;
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
        <span className="font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 text-[11px]">
          Select Formulation &amp; Size
        </span>
        <span className="font-mono text-xs font-bold text-[#1c3a13] dark:text-emerald-400">
          {variants.length} Options
        </span>
      </div>

      {/* Collapsed Trigger Button — 100% Matching Cart Drawer Luxury Pill */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select variant. Currently: ${activeVariant ? getVariantShadeName(activeVariant) : 'Default'}`}
        className={`w-full h-12 sm:h-[50px] px-3 sm:px-3.5 flex items-center justify-between gap-2.5 rounded-2xl border bg-white dark:bg-zinc-800/90 text-left transition-all shadow-2xs cursor-pointer select-none ${
          isOpen
            ? 'border-[#1c3a13] ring-2 ring-[#1c3a13]/20 dark:border-emerald-400 dark:ring-emerald-400/30'
            : 'border-[#1c3a13]/15 dark:border-white/12 hover:border-[#1c3a13]/35 dark:hover:border-white/30'
        }`}
      >
        {/* Left: Thumbnail Image + Variant Shade Name + Size Badge */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800 aspect-square">
            <Image
              src={safeImageUrl(activeVariant?.image || defaultImage)}
              alt={activeVariant?.name || 'Variant thumbnail'}
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
          <span className="text-xs sm:text-[13.5px] font-bold text-[#181C1A] dark:text-white truncate">
            {activeVariant ? getVariantShadeName(activeVariant) : 'Select a variant'}
          </span>
          {activeSize && (
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-zinc-700/80 text-[10px] sm:text-[11px] font-mono font-medium text-stone-600 dark:text-stone-300 leading-none">
              {activeSize}
            </span>
          )}
        </div>

        {/* Right: Price + Animated Chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-1">
          <span className="font-inter font-bold text-xs sm:text-[13.5px] text-[#1c3a13] dark:text-emerald-400">
            ৳{Math.round(activeVariant?.price ?? 0)}
          </span>
          <ChevronDown
            size={15}
            className={`text-stone-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#1c3a13] dark:text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Luxury Vertical Track Dropdown — Identical to Cart Drawer */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available variants"
          className="absolute left-0 right-0 top-full mt-2 z-40 w-full rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 px-3.5 py-2 tracking-wider bg-stone-50/80 dark:bg-zinc-800/40 border-b border-stone-100 dark:border-white/5 flex items-center justify-between">
            <span>Available Formulations &amp; Sizes</span>
            <span className="font-mono text-stone-500">{variants.length} Options</span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 dark:divide-white/5 py-1 scroll-smooth no-scrollbar">
            {variants.map((v) => {
              const isSelected = v.id === selectedVariantId;
              const isOOS = v.stock !== undefined && v.stock <= 0;
              const vSize = getVariantSize(v);
              const vShade = getVariantShadeName(v);
              const vImage = v.image || defaultImage;

              return (
                <button
                  key={`hero-var-${v.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isOOS}
                  onClick={() => handleSelectVariant(v)}
                  className={`w-full px-3 py-2.5 sm:px-3.5 sm:py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#E5EAE1] dark:bg-emerald-950/40 text-[#1c3a13] dark:text-emerald-200'
                      : isOOS
                      ? 'opacity-40 cursor-not-allowed bg-stone-50/40 dark:bg-zinc-800/30'
                      : 'hover:bg-stone-50 dark:hover:bg-zinc-800/70 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  {/* Left: Thumbnail + Shade + Size */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800">
                      {vImage ? (
                        <Image
                          src={safeImageUrl(vImage)}
                          alt={v.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-stone-500">
                          {v.name.slice(0, 3)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold truncate leading-tight">
                        {vShade}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {vSize && <span className="font-mono">Size: {vSize}</span>}
                        {vSize && <span>•</span>}
                        <span className={isOOS ? 'text-rose-500 font-medium' : 'text-emerald-700 dark:text-emerald-400 font-medium'}>
                          {isOOS ? 'Sold out' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Check */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-inter font-bold text-xs sm:text-sm text-[#1c3a13] dark:text-emerald-400">
                      ৳{Math.round(v.price)}
                    </span>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1c3a13] dark:bg-emerald-400 text-white dark:text-zinc-950 shadow-2xs">
                        <Check size={11} strokeWidth={3} />
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
