'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown, Check } from 'lucide-react';
import { safeImageUrl } from '@/lib/safe-image';
import type { BundleProductCandidate } from './SeedBundleDrawer';
import type { ProductVariantItem } from './SeedVariantRail';
import { cleanProductName } from './cleanProductName';

export interface SeedBundleProductCapsuleProps {
  stepNumber: number; // 1 or 2
  stepLabel: string; // "MAIN PRODUCT" or "FREQUENTLY PAIRED WITH THIS"
  stepLabelColor?: string;
  product: BundleProductCandidate;
  selectedVariantId: string | null;
  onVariantSelect: (variantId: string, price: number, stock: number, image?: string | null) => void;
  className?: string;
}

/**
 * Extract size or volume descriptor from variant attributes or name.
 */
function extractVariantSize(v: ProductVariantItem): string | null {
  if (v.attributes && typeof v.attributes === 'object') {
    const sizeKeys = ['size', 'Size', 'packSize', 'pack_size', 'volume', 'Volume', 'capacity', 'weight', 'Weight'];
    for (const key of sizeKeys) {
      if (v.attributes[key]) {
        return String(v.attributes[key]).trim();
      }
    }
    for (const [key, val] of Object.entries(v.attributes)) {
      if (val && typeof val === 'string' && ['size', 'volume', 'pack_size', 'weight'].includes(key.toLowerCase())) {
        return val.trim();
      }
    }
  }

  if (v.name) {
    if (v.name.includes('30*2') || v.name.toLowerCase().includes('30ml')) return '30*2 ml';
    if (v.name.includes('80*2') || v.name.toLowerCase().includes('80ml')) return '80*2 ml';
    const match = v.name.match(/\b(\d+(?:\*\d+)?\s*(?:ml|g|oz|kg|l|pcs?|pack))\b/i);
    if (match) return match[1].trim();
  }

  return null;
}

/**
 * Extract shade or color descriptor from variant attributes or name.
 */
function extractVariantShade(v: ProductVariantItem): string {
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

export default function SeedBundleProductCapsule({
  stepNumber,
  stepLabel,
  stepLabelColor = 'text-stone-500',
  product,
  selectedVariantId,
  onVariantSelect,
  className = '',
}: SeedBundleProductCapsuleProps) {
  const variants = useMemo(() => product.variants || [], [product.variants]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active Selected Variant
  const activeVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || (variants.length > 0 ? variants[0] : null);
  }, [variants, selectedVariantId]);

  const currentPrice = activeVariant?.price ?? product.price;
  const currentImage = activeVariant?.image || product.image;
  const activeSize = activeVariant ? extractVariantSize(activeVariant) : null;
  const activeShade = activeVariant ? extractVariantShade(activeVariant) : null;

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const hasMultipleVariants = variants.length > 1;

  return (
    <div
      ref={dropdownRef}
      className={`relative space-y-2.5 ${isOpen ? 'z-30' : 'z-10'} ${className}`}
      aria-label={`${stepLabel} - ${product.name}`}
    >
      
      {/* ── 1. Header Row: Thumbnail with Step Badge, Title & Price ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Thumbnail with Step Number Badge */}
          <div className="relative shrink-0">
            <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800 border border-stone-200/80 dark:border-white/10 shadow-2xs">
              <Image
                src={safeImageUrl(currentImage)}
                alt={product.name}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            {/* Numbered Badge (1 or 2) */}
            <div className="absolute -top-1.5 -left-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#122A16] dark:bg-emerald-500 text-white font-mono text-[9px] font-bold border-2 border-white dark:border-zinc-900 shadow-xs">
              {stepNumber}
            </div>
          </div>

          {/* Title & Step Label */}
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${stepLabelColor}`}>
              {stepLabel}
            </p>
            <h4 className="text-xs sm:text-[13px] font-bold text-[#122A16] dark:text-white truncate mt-0.5">
              {cleanProductName(product.name)}
            </h4>
          </div>
        </div>

        {/* Price on Right (Inter font, No-Space Rule) */}
        <div className="text-right shrink-0">
          <p className="font-inter font-bold text-sm sm:text-base text-[#122A16] dark:text-white leading-tight">
            ৳{Math.round(currentPrice)}
          </p>
        </div>
      </div>

      {/* ── 2. Custom Rich Dropdown Trigger (Closed State) ── */}
      {hasMultipleVariants && (
        <div className="relative pt-0.5">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={`Select variant for ${product.name}. Current: ${activeShade || activeSize || 'Default'}`}
            className={`w-full h-10 px-2.5 flex items-center justify-between gap-2.5 rounded-xl border bg-white dark:bg-zinc-800/95 transition-all text-left shadow-2xs cursor-pointer ${
              isOpen
                ? 'border-[#122A16] ring-1 ring-[#122A16] dark:border-emerald-400 dark:ring-emerald-400'
                : 'border-stone-200 dark:border-white/10 hover:border-stone-400 dark:hover:border-white/30'
            }`}
          >
            {/* Left: Thumbnail & Variant Label */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative h-6.5 w-6.5 rounded-md overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-50">
                <Image
                  src={safeImageUrl(currentImage)}
                  alt={activeVariant?.name || product.name}
                  fill
                  sizes="26px"
                  className="object-cover"
                />
              </div>

              <div className="flex items-center gap-1.5 min-w-0 text-xs font-semibold text-[#122A16] dark:text-white truncate">
                <span className="truncate">{activeShade || cleanProductName(product.name)}</span>
                {activeSize && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-700/80 text-[10px] font-mono text-stone-600 dark:text-stone-300">
                    {activeSize}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Price & Animated Chevron */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-inter font-bold text-xs text-[#122A16] dark:text-emerald-400">
                ৳{Math.round(currentPrice)}
              </span>
              <ChevronDown
                size={14}
                className={`text-stone-500 dark:text-stone-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* ── 3. Custom Rich Dropdown Menu (Open State - Vertical Track) ── */}
          {isOpen && (
            <div
              role="listbox"
              aria-label={`Available variants for ${product.name}`}
              className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Vertical Scrollable Track [ {image thumbnail} {color/shade} {size} {price} ] */}
              <div className="max-h-[220px] overflow-y-auto divide-y divide-stone-100 dark:divide-white/5 py-1 scroll-smooth">
                {variants.map((v) => {
                  const isSelected = v.id === activeVariant?.id;
                  const isOutOfStock = v.stock <= 0;
                  const vSize = extractVariantSize(v);
                  const vShade = extractVariantShade(v);
                  const vImage = v.image || product.image;

                  return (
                    <button
                      key={`capsule-var-${product.id}-${v.id}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isOutOfStock}
                      onClick={() => {
                        onVariantSelect(v.id, v.price, v.stock, v.image);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-stone-50/90 dark:bg-zinc-800/90'
                          : isOutOfStock
                          ? 'opacity-40 cursor-not-allowed bg-stone-50/40 dark:bg-zinc-800/30'
                          : 'hover:bg-stone-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      {/* Left: Thumbnail + Color/Shade + Size */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Image Thumbnail */}
                        <div className="relative h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-stone-200/80 dark:border-white/10 bg-stone-100 dark:bg-zinc-800">
                          {vImage ? (
                            <Image
                              src={safeImageUrl(vImage)}
                              alt={v.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-stone-100 dark:bg-zinc-800 text-[9px] font-bold text-stone-600">
                              {v.name.slice(0, 3)}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                            {vShade}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                            {vSize && (
                              <span className="font-mono font-medium">
                                Size: {vSize}
                              </span>
                            )}
                            {vSize && <span>•</span>}
                            <span>{isOutOfStock ? 'Out of Stock' : 'In Stock'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Selected Check */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-inter font-bold text-xs text-[#122A16] dark:text-emerald-400">
                          ৳{Math.round(v.price)}
                        </span>
                        {isSelected && (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#122A16] dark:bg-emerald-400 text-white dark:text-zinc-950 shadow-2xs">
                            <Check size={10} strokeWidth={3} />
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
      )}

    </div>
  );
}
