'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
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

function getSizeSubtitle(sizeStr: string, index: number, totalSizes: number): string | null {
  return null;
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

  // Detect available sizes
  const detectedSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    variants.forEach((v) => {
      const sizeAttr = extractVariantSize(v);
      if (sizeAttr) sizeSet.add(sizeAttr);
    });
    return Array.from(sizeSet);
  }, [variants]);

  // Initial size derived from current selected variant
  const activeVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId) || (variants.length > 0 ? variants[0] : null);
  }, [variants, selectedVariantId]);

  const activeSize = useMemo(() => {
    if (activeVariant) {
      const s = extractVariantSize(activeVariant);
      if (s) return s;
    }
    return detectedSizes[0] || null;
  }, [activeVariant, detectedSizes]);

  const [selectedSize, setSelectedSize] = useState<string | null>(activeSize);

  useEffect(() => {
    if (activeSize) {
      setSelectedSize(activeSize);
    }
  }, [activeSize]);

  // Filter variants matching active size (if multi-size exists)
  const filteredVariants = useMemo(() => {
    if (!selectedSize || detectedSizes.length <= 1) return variants;
    const matching = variants.filter((v) => extractVariantSize(v) === selectedSize);
    return matching.length > 0 ? matching : variants;
  }, [variants, selectedSize, detectedSizes.length]);

  // Handle clicking a size option card
  const handleSizeClick = (size: string) => {
    setSelectedSize(size);

    const matching = variants.filter((v) => extractVariantSize(v) === size);
    if (matching.length === 0) return;

    // Prefer keeping current shade match, otherwise pick first matching
    const currentShade = activeVariant ? extractVariantShade(activeVariant) : null;
    const shadeMatch = currentShade ? matching.find((v) => extractVariantShade(v) === currentShade) : null;
    const target = shadeMatch || matching[0];

    if (target) {
      onVariantSelect(target.id, target.price, target.stock, target.image);
    }
  };

  // Handle clicking a shade swatch
  const handleVariantClick = (v: ProductVariantItem) => {
    const vSize = extractVariantSize(v);
    if (vSize && vSize !== selectedSize) {
      setSelectedSize(vSize);
    }
    onVariantSelect(v.id, v.price, v.stock, v.image);
  };

  const currentPrice = activeVariant?.price ?? product.price;
  const currentImage = activeVariant?.image || product.image;
  const activeShadeName = activeVariant ? extractVariantShade(activeVariant) : null;

  // Active descriptor string e.g. "60g / Dewy Clear"
  const activeDescriptor = useMemo(() => {
    const parts: string[] = [];
    if (selectedSize) parts.push(selectedSize);
    if (activeShadeName && activeShadeName !== selectedSize) parts.push(activeShadeName);
    return parts.join(' / ');
  }, [selectedSize, activeShadeName]);

  return (
    <div className={`space-y-4 ${className}`} aria-label={`${stepLabel} - ${product.name}`}>
      
      {/* ── 1. Header Row: Thumbnail with Step Number, Title & Price ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Thumbnail with Step Number Badge */}
          <div className="relative shrink-0">
            <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-stone-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 shadow-2xs">
              <Image
                src={safeImageUrl(currentImage)}
                alt={product.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            {/* Numbered Badge (1 or 2) */}
            <div className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#122A16] dark:bg-emerald-500 text-white font-mono text-[10px] font-bold border-2 border-white dark:border-zinc-900 shadow-xs">
              {stepNumber}
            </div>
          </div>

          {/* Title & Step Label */}
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${stepLabelColor}`}>
              {stepLabel}
            </p>
            <h4 className="text-xs sm:text-[13px] font-bold text-[#122A16] dark:text-white truncate mt-0.5">
              {cleanProductName(product.name)}
            </h4>
          </div>
        </div>

        {/* Price on Right (Mandatory Inter Font, No-Space, No-Comma Rule) */}
        <div className="text-right shrink-0">
          <p className="font-inter font-bold text-sm sm:text-base text-[#122A16] dark:text-white leading-tight">
            ৳{Math.round(currentPrice)}
          </p>
        </div>
      </div>

      {/* ── 2. Size Selector (SELECT SIZE 2-Column Grid Cards) ── */}
      {detectedSizes.length > 1 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              SELECT SIZE
            </span>
            {selectedSize && (
              <span className="font-mono text-xs font-semibold text-[#122A16] dark:text-emerald-400">
                {selectedSize}
              </span>
            )}
          </div>

          {/* 2-Column Size Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {detectedSizes.map((sizeOption, idx) => {
              const isSelected = selectedSize === sizeOption;
              const matchingVars = variants.filter((v) => extractVariantSize(v) === sizeOption);
              const optionPrice = matchingVars[0]?.price ?? currentPrice;
              const subtitle = getSizeSubtitle(sizeOption, idx, detectedSizes.length);

              return (
                <button
                  key={`size-opt-${product.id}-${sizeOption}`}
                  type="button"
                  onClick={() => handleSizeClick(sizeOption)}
                  className={`relative flex items-center justify-between p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#122A16] bg-stone-50/80 dark:border-emerald-400 dark:bg-emerald-950/30 shadow-xs'
                      : 'border-stone-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 hover:border-stone-400 dark:hover:border-white/30'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-[#122A16] dark:text-white truncate">
                      {sizeOption}
                    </p>
                    {subtitle && (
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-inter font-bold text-xs text-[#122A16] dark:text-emerald-300">
                      ৳{Math.round(optionPrice)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Shade / Formulation / Swatch Rail ── */}
      {filteredVariants.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Shade / Formulation ({filteredVariants.length} available)
            </span>
            {activeDescriptor && (
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate max-w-[220px]">
                {activeDescriptor}
              </span>
            )}
          </div>

          {/* Swatch Tiles */}
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
            {filteredVariants.map((v) => {
              const isSelected = v.id === activeVariant?.id;
              const isOutOfStock = v.stock <= 0;
              const swatchImg = v.image || product.image;

              return (
                <button
                  key={`swatch-tile-${product.id}-${v.id}`}
                  type="button"
                  onClick={() => handleVariantClick(v)}
                  disabled={isOutOfStock}
                  aria-label={`Select ${v.name} • ৳${Math.round(v.price)}`}
                  className={`group relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#122A16] ring-1 ring-[#122A16] dark:border-emerald-400 dark:ring-emerald-400 scale-105 shadow-xs'
                      : isOutOfStock
                      ? 'border-stone-200 dark:border-zinc-800 opacity-40 cursor-not-allowed bg-stone-100'
                      : 'border-stone-200 dark:border-white/10 bg-white hover:border-stone-400 hover:scale-105'
                  }`}
                >
                  {swatchImg ? (
                    <Image
                      src={safeImageUrl(swatchImg)}
                      alt={v.name}
                      fill
                      sizes="52px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-stone-100 text-[10px] font-bold text-stone-600">
                      {v.name.slice(0, 3)}
                    </div>
                  )}

                  {/* Selected White Checkmark Circle Overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[0.5px]">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#122A16] shadow-xs">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
